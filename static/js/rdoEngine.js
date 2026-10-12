// ========================================================
// RDO ENGINE AUTO-WIRE - PETRA MINERAÇÃO
// CONECTA REATIVIDADE, SUPABASE, OFFLINE E GRAVAÇÃO DE METROS E VIAGENS
// ========================================================
import { supabase } from './supabaseClient.js';
import { validarHorimetro, formatarHoras } from './validacoesCampo.js';
import { salvarApontamentoOperacional, carregarDadosEquipamento, obterOperadorAtual } from './operacionalController.js';
import { sincronizarFilaPendentes, exibirAvisoFlutuante, atualizarIndicadorConectividade } from './offlineSync.js';

let turnoAtual = '1º Turno Diurno';
let equipamentoTag = 'UT-34';

// Determina TAG do equipamento pelo nome do arquivo ou cabeçalho
function detectarEquipamento() {
  const path = window.location.pathname.toUpperCase();
  if (path.includes('UT_34') || path.includes('BASCULANTE')) return 'UT-34';
  if (path.includes('UC_11') || path.includes('EC460B') || path.includes('ESCAVADEIRA')) return 'UC-11';
  if (path.includes('UC_15') || path.includes('L120F') || path.includes('CARREGADEIRA')) return 'UC-15';
  if (path.includes('UP_34') || path.includes('FOX') || path.includes('PERFURATRIZ')) return 'UP-34';
  if (path.includes('MN_01') || path.includes('120B') || path.includes('MOTONIVELADORA')) return 'MN-01';
  if (path.includes('UB_02') || path.includes('C125') || path.includes('BRITADOR')) return 'UB-02';
  if (path.includes('USINA') || path.includes('TRA_O')) return 'TR-USINA-04';
  if (path.includes('PIPA')) return 'PIPA-01';

  const select = document.getElementById('equipment-select');
  if (select && select.value) return select.value;

  return 'UT-34';
}

// Inicialização de eventos e cálculos automáticos
document.addEventListener('DOMContentLoaded', async () => {
  equipamentoTag = detectarEquipamento();

  // 1. Carregar prontuário do equipamento
  try {
    const dados = await carregarDadosEquipamento(equipamentoTag);
    if (dados && dados.relogio) {
      const elHorimetro = document.getElementById('preview-horometer');
      if (elHorimetro && (elHorimetro.textContent === '--' || elHorimetro.textContent.trim() === '')) {
        elHorimetro.textContent = formatarHoras(dados.relogio.horimetro_acumulado_total);
      }
    }
  } catch (e) {}

  // 2. Cálculo dinâmico de horas trabalhadas com validação amigável
  const hStartInput = document.getElementById('h-start') || 
                      document.getElementById('horim-ini') || 
                      document.querySelector('input[name="horimetro_inicial"]');
  const hEndInput = document.getElementById('h-end') || 
                    document.getElementById('horim-fim') || 
                    document.querySelector('input[name="horimetro_final"]');
  const diffDisplay = document.getElementById('diff-hours') || 
                      document.getElementById('txt-horas-calculadas');

  function recalcularHoras() {
    if (!hStartInput || !hEndInput) return;
    const start = parseFloat(hStartInput.value) || 0;
    const end = parseFloat(hEndInput.value) || 0;

    const res = validarHorimetro(start, end);
    if (diffDisplay) {
      if (res.valido) {
        diffDisplay.innerText = res.horas.toFixed(2);
        diffDisplay.classList.remove('text-rose-400', 'text-error');
      } else {
        diffDisplay.innerText = '0.00';
        diffDisplay.classList.add('text-rose-400');
      }
    }
  }

  if (hStartInput) hStartInput.addEventListener('input', recalcularHoras);
  if (hEndInput) hEndInput.addEventListener('input', recalcularHoras);
  recalcularHoras();

  // 3. Sobrescrever funções globais chamadas pelos botões de tela
  window.calculateWorkHours = recalcularHoras;
  window.calcularHoras = recalcularHoras;

  // Contador de viagens de toque rápido (Basculante / Pá)
  let debounceSyncViagem = null;
  window.recordTrip = function() {
    const countEl = document.getElementById('trip-count');
    if (countEl) {
      let current = parseInt(countEl.innerText) || 0;
      current++;
      countEl.innerText = current;

      if (navigator.vibrate) navigator.vibrate(40);

      // Sincroniza incremento com o backend e Supabase
      clearTimeout(debounceSyncViagem);
      debounceSyncViagem = setTimeout(async () => {
        try {
          await salvarApontamentoOperacional({
            id_equipamento: equipamentoTag,
            turno: turnoAtual,
            tipo_apontamento: 'transporte_viagens',
            producao_valor: current,
            viagens: current,
            horimetro_inicial: hStartInput ? parseFloat(hStartInput.value) || 0 : 0,
            horimetro_final: hEndInput ? parseFloat(hEndInput.value) || 0 : 0
          });
        } catch (e) {
          console.warn('Erro ao sincronizar viagem rápida:', e);
        }
      }, 800);
    }
  };

  window.setShift = function(shiftNum) {
    turnoAtual = shiftNum === 1 ? '1º Turno Diurno (07:00 - 15:48)' : '2º Turno Noturno (15:48 - 00:30)';
    const btn1 = document.getElementById('btn-shift-1') || document.getElementById('btn-turno-1');
    const btn2 = document.getElementById('btn-shift-2') || document.getElementById('btn-turno-2');
    if (btn1 && btn2) {
      if (shiftNum === 1) {
        btn1.className = 'h-12 rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-all bg-primary text-on-primary shadow-sm font-bold';
        btn2.className = 'h-12 rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-all text-on-surface-variant hover:text-on-surface';
      } else {
        btn2.className = 'h-12 rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-all bg-primary text-on-primary shadow-sm font-bold';
        btn1.className = 'h-12 rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-all text-on-surface-variant hover:text-on-surface';
      }
    }
  };

  // 4. Integração do Apontamento de Metros (Perfuratriz UP-34)
  const origConfirmarFuro = window.confirmarFuro;
  window.confirmarFuro = async function() {
    if (typeof origConfirmarFuro === 'function') {
      origConfirmarFuro();
    }

    const totalMetrosEl = document.getElementById('txt-total-metros');
    const contagemFurosEl = document.getElementById('txt-contagem-furos');
    const inputProf = document.getElementById('input-profundidade');

    const totalMetros = totalMetrosEl ? parseFloat(totalMetrosEl.textContent.replace(',', '.')) || 0 : 0;
    const furos = contagemFurosEl ? parseInt(contagemFurosEl.textContent) || 0 : 0;
    const profFuro = inputProf ? parseFloat(inputProf.value) || 0 : 0;

    const ini = hStartInput ? parseFloat(hStartInput.value) || 0 : 0;
    const fim = hEndInput ? parseFloat(hEndInput.value) || 0 : 0;

    // Persistência imediata do apontamento de metros
    try {
      await salvarApontamentoOperacional({
        id_equipamento: 'UP-34',
        turno: turnoAtual,
        tipo_apontamento: 'perfuracao_metros',
        producao_valor: totalMetros,
        metros_perfurados: totalMetros,
        contagem_furos: furos,
        profundidade_ultimo_furo: profFuro,
        horimetro_inicial: ini,
        horimetro_final: fim
      });
      exibirAvisoFlutuante(`Furo registrado! Total acumulado: ${totalMetros.toFixed(1)}m em ${furos} furos.`);
    } catch (err) {
      console.warn('Erro ao sincronizar furo:', err);
    }
  };

  // Botão salvar apontamento de perfuração
  const btnSalvarPerfuracao = document.getElementById('btn-salvar-perfuracao');
  if (btnSalvarPerfuracao) {
    btnSalvarPerfuracao.addEventListener('click', async () => {
      const totalMetrosEl = document.getElementById('txt-total-metros');
      const contagemFurosEl = document.getElementById('txt-contagem-furos');
      const totalMetros = totalMetrosEl ? parseFloat(totalMetrosEl.textContent.replace(',', '.')) || 0 : 0;
      const furos = contagemFurosEl ? parseInt(contagemFurosEl.textContent) || 0 : 0;

      await salvarApontamentoOperacional({
        id_equipamento: 'UP-34',
        turno: turnoAtual,
        tipo_apontamento: 'perfuracao_metros',
        producao_valor: totalMetros,
        metros_perfurados: totalMetros,
        contagem_furos: furos,
        horimetro_inicial: hStartInput ? parseFloat(hStartInput.value) || 0 : 0,
        horimetro_final: hEndInput ? parseFloat(hEndInput.value) || 0 : 0
      });
    });
  }

  // 5. Integração do Apontamento de Viagens e Estoque (Basculante / Carregadeira)
  const btnSalvarViagens = document.getElementById('save-button');
  if (btnSalvarViagens) {
    btnSalvarViagens.addEventListener('click', async () => {
      // Coleta detalhada do estoque e viagens horárias
      const materiais = {};
      document.querySelectorAll('.estoque-input').forEach(inp => {
        const id = inp.dataset.id || inp.name || 'material';
        materiais[id] = parseInt(inp.value) || 0;
      });

      let totalViagens = 0;
      const grandTotalEl = document.getElementById('grand-total-display');
      if (grandTotalEl) {
        totalViagens = parseInt(grandTotalEl.textContent) || 0;
      } else {
        document.querySelectorAll('.estoque-input').forEach(inp => {
          totalViagens += parseInt(inp.value) || 0;
        });
      }

      const ini = hStartInput ? parseFloat(hStartInput.value) || 0 : 0;
      const fim = hEndInput ? parseFloat(hEndInput.value) || 0 : 0;

      try {
        await salvarApontamentoOperacional({
          id_equipamento: equipamentoTag,
          turno: turnoAtual,
          tipo_apontamento: 'transporte_viagens',
          producao_valor: totalViagens,
          viagens: totalViagens,
          detalhes_materiais: materiais,
          horimetro_inicial: ini,
          horimetro_final: fim
        });
        exibirAvisoFlutuante(`Lançamento de viagens salvo com sucesso! Total: ${totalViagens} viagens.`);
      } catch (err) {
        console.warn('Erro ao salvar viagens:', err);
      }
    });
  }

  // 6. Salvar Apontamento unificado com tratamento de erros humanos
  window.saveShift = async function() {
    const hStart = hStartInput ? parseFloat(hStartInput.value) : 0;
    const hEnd = hEndInput ? parseFloat(hEndInput.value) : 0;
    const tripEl = document.getElementById('trip-count');
    const viagens = tripEl ? parseInt(tripEl.innerText) : 0;

    // Coleta checklist
    const checklistRespostas = {};
    document.querySelectorAll('input[type="checkbox"]').forEach((cb, idx) => {
      const nome = cb.name || cb.id || `item_${idx}`;
      checklistRespostas[nome] = cb.checked ? 'OK' : 'NAO_OK';
    });

    const resultado = await salvarApontamentoOperacional({
      id_equipamento: equipamentoTag,
      turno: turnoAtual,
      horimetro_inicial: hStart,
      horimetro_final: hEnd,
      producao_valor: viagens,
      checklist_respostas: checklistRespostas
    });

    return resultado;
  };

  // Conectar com a função enviarDados legada das telas
  window.enviarDados = window.saveShift;

  // 7. Configurar rotas da barra de navegação inferior (Tabs)
  configurarNavegacaoAbas();
});

// Mapeia navegação por abas com base no equipamento atual
function configurarNavegacaoAbas() {
  const mapaAbas = {
    'UT-34': {
      'apontamento': '/tela_apontamento_basculante_ut_34.html',
      'condicoes-viagens': '/tela_viagens_estoque_ut_34.html',
      'checklist': '/tela_check_list_pr_operacional_ut_34.html',
      'paradas': '/tela_paradas_do_equipamento_ut_34.html'
    },
    'UC-11': {
      'apontamento': '/tela_apontamento_escavadeira_ec460b_uc_11.html',
      'checklist': '/tela_check_list_pr_operacional_ec460b.html',
      'paradas': '/tela_paradas_do_equipamento_ec460b.html'
    },
    'UC-15': {
      'apontamento': '/tela_apontamento_carregadeira_l120f_uc_15.html',
      'condicoes-viagens': '/tela_estoque_viagens_carregadeira_l120f.html',
      'checklist': '/tela_check_list_pr_operacional_l120f_uc_15.html',
      'paradas': '/tela_paradas_do_equipamento_l120f_uc_15.html'
    },
    'UP-34': {
      'apontamento': '/tela_apontamento_perfuratriz_up_34.html',
      'condicoes-viagens': '/tela_consumo_e_escala_up_34.html',
      'checklist': '/tela_check_list_pr_operacional_up_34.html',
      'paradas': '/tela_paradas_do_equipamento_up_34.html'
    },
    'MN-01': {
      'apontamento': '/tela_apontamento_motoniveladora_120b_mn_01.html',
      'condicoes-viagens': '/tela_pista_servi_os_motoniveladora_120b.html',
      'checklist': '/tela_check_list_pr_operacional_motoniveladora_120b.html',
      'paradas': '/tela_paradas_do_equipamento_motoniveladora_120b.html'
    },
    'TR-USINA-04': {
      'apontamento': '/tela_apontamento_usina_tra_o_f_cil.html',
      'condicoes-viagens': '/tela_viagens_internas_produ_o_usina_tra_o_f_cil.html',
      'checklist': '/tela_check_list_pr_operacional_usina_tra_o_f_cil.html',
      'paradas': '/tela_paradas_do_equipamento_usina_tra_o_f_cil.html'
    }
  };

  const tag = detectarEquipamento();
  const rotasEquip = mapaAbas[tag] || mapaAbas['UT-34'];

  document.querySelectorAll('nav a[data-path]').forEach((link) => {
    const aba = link.getAttribute('data-path');
    if (rotasEquip[aba]) {
      link.setAttribute('href', rotasEquip[aba]);
    }
  });
}
