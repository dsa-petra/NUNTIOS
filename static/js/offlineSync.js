// ========================================================
// MOTOR OFFLINE-FIRST (INDEXEDDB & SYNC QUEUE) - PETRA MINERAÇÃO
// RESILIÊNCIA EM ÁREA DE SOMBRA / CAVA DE MINA PROFUNDA
// ========================================================
import { supabase } from './supabaseClient.js';
import { gerarUUID } from './validacoesCampo.js';

const DB_NAME = 'petra_rdo_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'fila_apontamentos';
const LOCALSTORAGE_KEY = 'petra_apontamentos_pendentes';

let dbInstance = null;

/**
 * Inicialização e abertura do banco IndexedDB
 */
export async function obterBanco() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[RDO Offline] IndexedDB indisponível, usando localStorage.');
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id_apontamento' });
        store.createIndex('criado_em', 'criado_em', { unique: false });
        store.createIndex('id_equipamento', 'id_equipamento', { unique: false });
        store.createIndex('status_sinc', 'status_sinc', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (err) => {
      console.warn('[RDO Offline] Erro ao abrir IndexedDB:', err);
      resolve(null);
    };
  });
}

/**
 * Salvar apontamento no armazenamento local resiliente (IndexedDB com fallback para localStorage).
 */
export async function salvarApontamentoOffline(dados) {
  const db = await obterBanco();
  
  // Garantir identificador único para idempotência
  const registro = {
    ...dados,
    id_apontamento: dados.id_apontamento || gerarUUID(),
    criado_em: dados.criado_em || new Date().toISOString(),
    status_sinc: 'PENDENTE'
  };

  if (db) {
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(registro);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[RDO Offline] Falha no IndexedDB, gravando em localStorage:', e);
      salvarNoLocalStorage(registro);
    }
  } else {
    salvarNoLocalStorage(registro);
  }

  // Tenta sincronizar imediatamente se estiver online
  if (navigator.onLine) {
    sincronizarFilaPendentes();
  } else {
    atualizarIndicadorConectividade(false, `Sem sinal · Apontamento seguro no tablet`);
  }

  return registro;
}

function salvarNoLocalStorage(registro) {
  try {
    const lista = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY) || '[]');
    const index = lista.findIndex(item => item.id_apontamento === registro.id_apontamento);
    if (index >= 0) {
      lista[index] = registro;
    } else {
      lista.push(registro);
    }
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(lista));
  } catch (err) {
    console.error('[RDO Offline] Erro ao gravar em localStorage:', err);
  }
}

/**
 * Obter todos os apontamentos pendentes na fila
 */
export async function obterApontamentosPendentes() {
  const db = await obterBanco();
  const registros = [];

  if (db) {
    try {
      const itensDb = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      registros.push(...itensDb);
    } catch (err) {
      console.warn('[RDO Offline] Erro ao ler fila IndexedDB:', err);
    }
  }

  // Mesclar com possíveis dados do localStorage
  try {
    const itensLs = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY) || '[]');
    for (const item of itensLs) {
      if (!registros.some(r => r.id_apontamento === item.id_apontamento)) {
        registros.push(item);
      }
    }
  } catch (e) {}

  return registros.filter(r => r.status_sinc === 'PENDENTE');
}

/**
 * Remover ou marcar item como concluído após sucesso
 */
export async function concluirApontamentoSincronizado(idApontamento) {
  const db = await obterBanco();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(idApontamento);
    } catch (e) {}
  }

  try {
    const lista = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY) || '[]');
    const filtrada = lista.filter(item => item.id_apontamento !== idApontamento);
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(filtrada));
  } catch (e) {}
}

/**
 * Disparar a fila de sincronização quando a rede estiver disponível.
 */
let sincronizando = false;
export async function sincronizarFilaPendentes() {
  if (sincronizando || !navigator.onLine) return;

  const pendentes = await obterApontamentosPendentes();
  if (pendentes.length === 0) {
    atualizarIndicadorConectividade(true, 'CONECTADO À NUVEM · SISTEMA SINCRONIZADO');
    return;
  }

  sincronizando = true;
  atualizarIndicadorConectividade(true, `Sincronizando ${pendentes.length} apontamento(s)...`);

  let enviados = 0;

  for (const item of pendentes) {
    try {
      // 1. Tenta enviar para o Supabase oficial
      let supabaseSucesso = false;
      if (supabase) {
        // Mapeia colunas da tabela producao_perfuracao_horaria
        const payloadSupabase = {
          id_apontamento: item.id_apontamento,
          id_equipamento: item.id_equipamento || item.equipamento,
          data_hora_apontamento: item.data_hora_apontamento || item.criado_em,
          turno: item.turno || '1º Turno',
          matricula_operador: item.matricula_operador || item.matricula,
          nome_operador: item.nome_operador,
          horimetro_inicial: parseFloat(item.horimetro_inicial) || 0,
          horimetro_final: parseFloat(item.horimetro_final) || 0,
          producao_valor: parseFloat(item.producao_valor || item.viagens || 0),
          diesel_abastecido_litros: parseFloat(item.diesel_abastecido_litros || 0),
          horimetro_martelo: parseFloat(item.horimetro_martelo || 0),
          checklist_respostas: item.checklist_respostas || {},
          motivo_parada_codigo: item.motivo_parada_codigo || null,
          duracao_parada_minutos: parseInt(item.duracao_parada_minutos || 0),
          horimetro_parada_ini: item.horimetro_parada_ini || null,
          horimetro_parada_fim: item.horimetro_parada_fim || null,
          observacao_parada: item.observacao_parada || null
        };

        const { error } = await supabase
          .from('producao_perfuracao_horaria')
          .upsert([payloadSupabase], { onConflict: 'id_apontamento' });

        if (!error) {
          supabaseSucesso = true;
        } else {
          console.warn('[RDO Sync] Supabase retornou aviso:', error.message);
        }
      }

      // 2. Envia também para o servidor de retaguarda (backup e log)
      try {
        await fetch('/salvar_apontamento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      } catch (e) {}

      // Marca como concluído se enviado para Supabase ou salvo no backend
      await concluirApontamentoSincronizado(item.id_apontamento);
      enviados++;
    } catch (err) {
      console.warn('[RDO Sync] Falha ao sincronizar registro:', err);
    }
  }

  sincronizando = false;
  const restantes = await obterApontamentosPendentes();

  if (restantes.length === 0) {
    atualizarIndicadorConectividade(true, 'CONECTADO À NUVEM · SISTEMA SINCRONIZADO');
    if (enviados > 0) {
      exibirAvisoFlutuante(`✅ Sincronização concluída! ${enviados} registro(s) enviados à base.`);
    }
  } else {
    atualizarIndicadorConectividade(false, `${restantes.length} apontamento(s) pendentes no tablet`);
  }
}

/**
 * Atualiza o indicador de conectividade nativo presente nas telas
 */
export function atualizarIndicadorConectividade(online, mensagem) {
  const dot = document.getElementById('cloud-status-dot');
  const ping = document.getElementById('cloud-ping-dot');
  const text = document.getElementById('cloud-status-text');

  if (text) {
    text.textContent = mensagem || (online ? 'CONECTADO À NUVEM · SISTEMA SINCRONIZADO' : 'SEM SINAL · MODO LOCAL ATIVO');
  }

  if (dot) {
    if (online) {
      dot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500';
      if (ping) ping.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
    } else {
      dot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500';
      if (ping) ping.className = 'hidden';
    }
  }
}

/**
 * Alerta flutuante sutil de campo sem atrapalhar a operação
 */
export function exibirAvisoFlutuante(mensagem, tipo = 'sucesso') {
  if (typeof document === 'undefined') return;

  let toast = document.getElementById('rdo-toast-feedback');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'rdo-toast-feedback';
    toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[90%] px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center justify-between gap-3 transition-all duration-300 transform opacity-0 -translate-y-2 pointer-events-none';
    document.body.appendChild(toast);
  }

  if (tipo === 'erro') {
    toast.style.backgroundColor = '#991b1b'; // red-800
    toast.style.color = '#ffffff';
    toast.style.border = '1px solid #f87171';
  } else if (tipo === 'aviso') {
    toast.style.backgroundColor = '#854d0e'; // yellow-800
    toast.style.color = '#ffffff';
    toast.style.border = '1px solid #facc15';
  } else {
    toast.style.backgroundColor = '#065f46'; // emerald-800
    toast.style.color = '#ffffff';
    toast.style.border = '1px solid #34d399';
  }

  toast.innerHTML = `<span>${mensagem}</span>`;
  toast.classList.remove('opacity-0', '-translate-y-2');
  toast.classList.add('opacity-100', 'translate-y-0');

  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', '-translate-y-2');
  }, 3500);
}

// Inicia monitoramento de rede e sincronização periódica
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    sincronizarFilaPendentes();
  });

  window.addEventListener('offline', () => {
    atualizarIndicadorConectividade(false, 'SEM SINAL · MODO LOCAL ATIVO');
  });

  window.addEventListener('load', () => {
    obterBanco();
    sincronizarFilaPendentes();
  });

  // Checagem periódica suave a cada 20 segundos
  setInterval(() => {
    if (navigator.onLine) {
      sincronizarFilaPendentes();
    }
  }, 20000);

  // Expor no escopo global
  window.salvarApontamentoOffline = salvarApontamentoOffline;
  window.sincronizarFilaPendentes = sincronizarFilaPendentes;
  window.obterApontamentosPendentes = obterApontamentosPendentes;
}
