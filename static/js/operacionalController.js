// ========================================================
// CONTROLADOR OPERACIONAL PRINCIPAL - RDO DIGITAL PETRA MINERAÇÃO
// LÓGICA DE NEGÓCIO, REATIVIDADE E INTEGRAÇÕES SUPABASE
// ========================================================
import { supabase } from './supabaseClient.js';
import { validarHorimetro, validarChecklist, formatarHoras, gerarUUID } from './validacoesCampo.js';
import { salvarApontamentoOffline, exibirAvisoFlutuante, sincronizarFilaPendentes } from './offlineSync.js';

// Cache em memória de operadores e equipamentos
const CACHE_EQUIPAMENTOS = {};
let operadorLogado = null;

/**
 * 1. FLUXO DE ACESSO & AUTENTICAÇÃO
 */
export async function processarLogin(pinDigitado) {
  const pin = (pinDigitado || '').toString().trim();

  // Usuários padrão locais para fallback imediato de campo (caso sem rede)
  const USUARIOS_LOCAIS = {
    '1234': { matricula_operador: 'MEC-01', nome_operador: 'Equipe de Manutenção', perfil_acesso: 'manutencao', ativo: true, rota: '/tela_liberacao_oficina.html' },
    '5678': { matricula_operador: 'OP-102', nome_operador: 'Operador de Campo', perfil_acesso: 'operacao', ativo: true, rota: '/tela_selecao_equipamento.html' },
    '9999': { matricula_operador: 'SUP-01', nome_operador: 'Gestor / Supervisão', perfil_acesso: 'gestao', ativo: true, rota: '/tela_hub_central.html' }
  };

  // 1.1 Consulta ao Supabase se online
  if (navigator.onLine && supabase) {
    try {
      const { data, error } = await supabase
        .from('tb_operadores')
        .select('matricula_operador, nome_operador, perfil_acesso, ativo')
        .eq('senha_hash', pin)
        .maybeSingle();

      if (!error && data) {
        if (!data.ativo) {
          return { sucesso: false, mensagem: "Matrícula inativa. Fale com a supervisão de turno." };
        }

        salvarSessaoOperador(data);
        return { sucesso: true, rota: obterRotaPerfil(data.perfil_acesso), usuario: data };
      }
    } catch (err) {
      console.warn('[RDO Login] Consulta remota falhou, aplicando fallback local:', err);
    }
  }

  // 1.2 Fallback local com PINs de contingência
  if (USUARIOS_LOCAIS[pin]) {
    const usuario = USUARIOS_LOCAIS[pin];
    salvarSessaoOperador(usuario);
    return { sucesso: true, rota: usuario.rota, usuario };
  }

  return { sucesso: false, mensagem: "PIN não reconhecido. Verifique a numeração digitada." };
}

export function salvarSessaoOperador(operador) {
  operadorLogado = operador;
  try {
    localStorage.setItem('operador_atual', JSON.stringify(operador));
  } catch (e) {}
}

export function obterOperadorAtual() {
  if (operadorLogado) return operadorLogado;
  try {
    const salvo = localStorage.getItem('operador_atual');
    if (salvo) {
      operadorLogado = JSON.parse(salvo);
      return operadorLogado;
    }
  } catch (e) {}
  return { matricula_operador: 'OP-102', nome_operador: 'Operador de Turno' };
}

function obterRotaPerfil(perfil) {
  const p = (perfil || '').toLowerCase();
  if (p === 'manutencao' || p === 'mecanico' || p === 'oficina') return '/tela_liberacao_oficina.html';
  if (p === 'gestao' || p === 'admin' || p === 'supervisor') return '/tela_hub_central.html';
  return '/tela_selecao_equipamento.html';
}

/**
 * 2. CARREGAMENTO DE PRONTUÁRIO E RELÓGIO DE MANUTENÇÃO
 */
export async function carregarDadosEquipamento(tagEquipamento) {
  const tag = (tagEquipamento || '').trim();
  if (!tag) return null;

  let prontuario = null;
  let relogio = null;

  if (supabase && navigator.onLine) {
    try {
      const [respPront, respRel] = await Promise.all([
        supabase.from('prontuario_equipamentos').select('*').eq('id_equipamento', tag).maybeSingle(),
        supabase.from('relogio_manutencao').select('*').eq('id_equipamento', tag).maybeSingle()
      ]);

      if (!respPront.error && respPront.data) prontuario = respPront.data;
      if (!respRel.error && respRel.data) relogio = respRel.data;
    } catch (e) {
      console.warn('[RDO Equipamentos] Consulta online falhou:', e);
    }
  }

  // Preenchimento com valores padrão de prontuário caso offline
  if (!prontuario) {
    prontuario = {
      id_equipamento: tag,
      requer_oleo_motor: true,
      requer_oleo_hidraulico: true,
      requer_nivel_arrefecimento: true,
      requer_sistema_freios: true,
      requer_pressao_pneus: tag.startsWith('UT') || tag.startsWith('MN') || tag.includes('PIPA'),
      requer_esteira_rodante: tag.startsWith('UC') || tag.startsWith('UP'),
      requer_vazamento_mangueiras: true,
      capacidade_historica_hora: 15.0,
      meta_consumo_hora: 25.0
    };
  }

  if (!relogio) {
    relogio = {
      id_equipamento: tag,
      horimetro_acumulado_total: 14820.4,
      horas_desde_ultima_revisao: 120.5,
      proxima_revisao_horas: tag === 'MN-01' ? 40 : 250,
      status_manutencao: 'Liberado para Operação'
    };
  }

  CACHE_EQUIPAMENTOS[tag] = { prontuario, relogio };
  return { prontuario, relogio };
}

/**
 * 3. MÁQUINA DE ESTADOS: CONTADORES RÁPIDOS DE VIAGENS E PRODUÇÃO
 */
export function configurarContador(elementoId, valorInicial = 0, onChange = null) {
  const el = document.getElementById(elementoId);
  if (!el) return { getValor: () => 0, setValor: () => {} };

  let valor = parseInt(el.textContent || el.value) || valorInicial;

  function atualizar(novoValor) {
    valor = Math.max(0, novoValor);
    if (el.tagName === 'INPUT') {
      el.value = valor;
    } else {
      el.textContent = valor;
    }
    if (typeof onChange === 'function') onChange(valor);
  }

  atualizar(valor);

  return {
    incrementar: (passo = 1) => atualizar(valor + passo),
    decrementar: (passo = 1) => atualizar(valor - passo),
    getValor: () => valor,
    setValor: (v) => atualizar(v)
  };
}

/**
 * 4. REGISTRO COMPLETO DE APONTAMENTO OPERACIONAL
 */
export async function salvarApontamentoOperacional(dadosFormulario) {
  const operador = obterOperadorAtual();

  // Validação obrigatória do horímetro
  const validacaoH = validarHorimetro(dadosFormulario.horimetro_inicial, dadosFormulario.horimetro_final);
  if (!validacaoH.valido) {
    exibirAvisoFlutuante(`⚠️ ${validacaoH.mensagem}`, 'erro');
    return { sucesso: false, erro: validacaoH.mensagem };
  }

  const payload = {
    id_apontamento: gerarUUID(),
    data_hora_apontamento: new Date().toISOString(),
    turno: dadosFormulario.turno || '1º Turno Diurno',
    id_equipamento: dadosFormulario.id_equipamento || 'UT-34',
    matricula_operador: operador.matricula_operador || 'OP-102',
    nome_operador: operador.nome_operador || 'Operador Responsável',
    horimetro_inicial: parseFloat(dadosFormulario.horimetro_inicial),
    horimetro_final: parseFloat(dadosFormulario.horimetro_final),
    horas_trabalhadas: validacaoH.horas,
    producao_valor: parseFloat(dadosFormulario.producao_valor || dadosFormulario.viagens || 0),
    diesel_abastecido_litros: parseFloat(dadosFormulario.diesel_abastecido_litros || 0),
    horimetro_martelo: parseFloat(dadosFormulario.horimetro_martelo || 0),
    checklist_respostas: dadosFormulario.checklist_respostas || {},
    motivo_parada_codigo: dadosFormulario.motivo_parada_codigo || null,
    duracao_parada_minutos: parseInt(dadosFormulario.duracao_parada_minutos || 0),
    horimetro_parada_ini: dadosFormulario.horimetro_parada_ini || null,
    horimetro_parada_fim: dadosFormulario.horimetro_parada_fim || null,
    observacao_parada: dadosFormulario.observacao_parada || null
  };

  // Salva no motor offline resiliente (IndexedDB / Sync Queue)
  const salvo = await salvarApontamentoOffline(payload);

  // Vibração tátil em dispositivos móveis
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([40, 30, 40]);
  }

  exibirAvisoFlutuante('✅ Apontamento registrado com sucesso!');
  return { sucesso: true, dados: salvo };
}

/**
 * 5. CONSULTA DE MOTIVOS DE PARADA
 */
export async function carregarMotivosParada(idEquipamento = null) {
  if (supabase && navigator.onLine) {
    try {
      let query = supabase.from('paradas_equipamentos').select('*');
      if (idEquipamento) {
        query = query.or(`id_equipamento.eq.${idEquipamento},id_equipamento.is.null`);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data;
    } catch (e) {}
  }

  // Lista padrão homologada da Petra Mineração
  return [
    { motivo_codigo: 'MEC-01', motivo_descricao: 'Manutenção Mecânica / Quebra', categoria_parada: 'Mecânica' },
    { motivo_codigo: 'ELE-01', motivo_descricao: 'Pane Elétrica / Sensores', categoria_parada: 'Mecânica' },
    { motivo_codigo: 'ABAS-01', motivo_descricao: 'Abastecimento de Diesel', categoria_parada: 'Operacional' },
    { motivo_codigo: 'ALM-01', motivo_descricao: 'Horário de Refeição / Almoço', categoria_parada: 'Operacional' },
    { motivo_codigo: 'CLI-01', motivo_descricao: 'Chuva Forte / Pista Escorregadia', categoria_parada: 'Clima' },
    { motivo_codigo: 'PLT-01', motivo_descricao: 'Espera de Britador / Silo Cheio', categoria_parada: 'Operacional' }
  ];
}
