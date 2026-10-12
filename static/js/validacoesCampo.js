// ========================================================
// MÓDULO DE VALIDAÇÕES DE CAMPO - RDO DIGITAL PETRA MINERAÇÃO
// DIRETRIZ: ZERO TERMOS TÉCNICOS PARA O OPERADOR DE CAMPO
// ========================================================

/**
 * Validação rigorosa de horímetro inicial vs final.
 * Regra: horimetro_final >= horimetro_inicial.
 */
export function validarHorimetro(hInicial, hFinal) {
  const start = parseFloat(String(hInicial).replace(',', '.'));
  const end = parseFloat(String(hFinal).replace(',', '.'));

  if (isNaN(start)) {
    return {
      valido: false,
      mensagem: "Por favor, digite o horímetro inicial indicado no painel da máquina.",
      horas: 0
    };
  }

  if (isNaN(end)) {
    return {
      valido: false,
      mensagem: "Por favor, digite o horímetro final indicado no painel da máquina.",
      horas: 0
    };
  }

  if (end < start) {
    return {
      valido: false,
      mensagem: "Horímetro final menor que o inicial. Verifique o painel da máquina.",
      horas: 0
    };
  }

  const horasTrabalhadas = parseFloat((end - start).toFixed(2));

  // Alerta preventivo se o turno ultrapassar 16 horas sem justificativa
  if (horasTrabalhadas > 16) {
    return {
      valido: true,
      alerta: "Horas calculadas acima da jornada padrão de turno. Confirme as leituras.",
      mensagem: "Horímetro consistente.",
      horas: horasTrabalhadas
    };
  }

  return {
    valido: true,
    mensagem: "Horímetro consistente.",
    horas: horasTrabalhadas
  };
}

/**
 * Validação de checklist operacional contra itens requeridos pelo prontuário.
 */
export function validarChecklist(respostas, itensRequeridos = {}) {
  const pendencias = [];

  for (const [campo, requerido] of Object.entries(itensRequeridos)) {
    if (requerido === true) {
      const resp = respostas[campo];
      if (!resp || resp === 'PENDENTE' || resp === 'NAO_OK') {
        const rotulo = formatarNomeItemChecklist(campo);
        pendencias.push(rotulo);
      }
    }
  }

  if (pendencias.length > 0) {
    return {
      conforme: false,
      mensagem: `Itens obrigatórios com atenção: ${pendencias.slice(0, 2).join(', ')}${pendencias.length > 2 ? '...' : ''}.`,
      pendencias
    };
  }

  return {
    conforme: true,
    mensagem: "Checklist 100% conforme para operação.",
    pendencias: []
  };
}

/**
 * Tradução de campo técnico para linguagem amigável de campo.
 */
export function formatarNomeItemChecklist(campo) {
  const mapa = {
    requer_oleo_motor: "Óleo do Motor",
    requer_oleo_hidraulico: "Óleo Hidráulico",
    requer_nivel_arrefecimento: "Água do Radiador / Arrefecimento",
    requer_sistema_freios: "Sistema de Freios",
    requer_pressao_pneus: "Calibragem dos Pneus",
    requer_esteira_rodante: "Esteira e Roletes",
    requer_vazamento_mangueiras: "Vazamento de Mangueiras",
    requer_pressao_compressor: "Pressão do Compressor",
    requer_horimetro_martelo: "Horímetro do Martelo",
    requer_itens_seguranca: "Itens de Segurança (Extintor/Alarme)"
  };
  return mapa[campo] || campo.replace(/^requer_/, '').replace(/_/g, ' ');
}

/**
 * Geração de UUID v4 para idempotência estrita em sincronizações offline.
 */
export function gerarUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Formata horímetros e valores métricos no padrão brasileiro.
 */
export function formatarHoras(valor) {
  const num = parseFloat(valor) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}
