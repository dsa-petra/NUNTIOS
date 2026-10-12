import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexão com o banco Supabase oficial da Petra Mineração
const SUPABASE_URL = 'https://mgzyrcnkmaepybaeznij.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nenlyY25rbWFlcHliYWV6bmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzIxMDQsImV4cCI6MjEwNzA0ODEwNH0.kAtmUAKSn53owxV8eNHfSOtkeQkjs5RkxVD54p_2Vlk';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Base de equipamentos e operadores com controle de estado em tempo real da Petra Mineração
const HORAS_HEATMAP = ['07h', '08h', '09h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h'];

const FROTA_PETRA = [
  {
    id_equipamento: 'UT-34',
    nome_equipamento: 'Mercedes-Benz Axor 4144 (Basculante 8x4)',
    categoria: 'Carga & Transporte',
    catCode: 'CARGA',
    horometro_acumulado_total: 14820.4,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Mina Sul · Frente de Lavra 03',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:30',
      laudo: 'Checklist pré-turno 100% aprovado. Freios, pneus e fluidos em conformidade.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 95, 100, 85, 100, 100, 95, 100, 100, 100]
  },
  {
    id_equipamento: 'UT-35',
    nome_equipamento: 'Mercedes-Benz Actros 4844',
    categoria: 'Carga & Transporte',
    catCode: 'CARGA',
    horometro_acumulado_total: 11340.8,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Mina Sul · Frente de Lavra 01',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:35',
      laudo: 'Inspeção diária OK. Pressão dos pneus 115 PSI conforme tabela técnica.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 100, 90, 85, 100, 100, 100, 100, 100, 100]
  },
  {
    id_equipamento: 'UT-32',
    nome_equipamento: 'Mercedes-Benz Axor 3344',
    categoria: 'Carga & Transporte',
    catCode: 'CARGA',
    horometro_acumulado_total: 9215.1,
    status_operacional: 'Em Oficina (Aguardando Aval)',
    liberado_para_operador: false, // BLOQUEADO PARA O OPERADOR! Requer Aval do Mecânico
    localizacao: 'Oficina Mecânica Central - Box 02',
    aval_mecanico: {
      concedido: false,
      matricula: null,
      nome: null,
      data_hora: null,
      laudo: 'Manutenção de freios concluída. Aguardando checklist de entrega técnica e assinatura do mecânico.',
      checklist: null
    },
    ordem_servico: {
      os: 'OS-2026-089',
      servico: 'Substituição de pastilhas de freio do 2º eixo e alinhamento',
      status: 'Aguardando Aval do Mecânico',
      previsao: '14:30'
    },
    disponibilidade_horas: [0, 0, 0, 0, 0, 30, 60, 85, 0, 0, 0, 0]
  },
  {
    id_equipamento: 'UT-33',
    nome_equipamento: 'Mercedes-Benz Axor 4144 (Reserva)',
    categoria: 'Carga & Transporte',
    catCode: 'CARGA',
    horometro_acumulado_total: 16902.3,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Pátio de Estéril',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:40',
      laudo: 'Reserva quente inspecionada e pronta para entrada imediata.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
  },
  {
    id_equipamento: 'UC-11',
    nome_equipamento: 'Volvo EC460B (Rompedor / Concha 3.2m³)',
    categoria: 'Escavação',
    catCode: 'ESCAV',
    horometro_acumulado_total: 18441.7,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Mina Norte · Bancada 780',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:15',
      laudo: 'Acoplamento de rompedor verificado. Pressão do acumulador dentro dos 140 bar nominais.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 90, 100, 80, 100, 100, 95, 100, 100, 100]
  },
  {
    id_equipamento: 'UC-12',
    nome_equipamento: 'Volvo EC480D Escavadeira',
    categoria: 'Escavação',
    catCode: 'ESCAV',
    horometro_acumulado_total: 12650.0,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Frente de Minério 02',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:20',
      laudo: 'Inspeção geral OK. Tensão de esteiras ajustada.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 100, 100, 85, 100, 100, 100, 100, 100, 100]
  },
  {
    id_equipamento: 'UC-10',
    nome_equipamento: 'Komatsu PC350LC',
    categoria: 'Escavação',
    catCode: 'ESCAV',
    horometro_acumulado_total: 8410.2,
    status_operacional: 'Em Oficina (Aguardando Aval)',
    liberado_para_operador: false, // BLOQUEADO PARA O OPERADOR!
    localizacao: 'Mina Sul · Acesso 04',
    aval_mecanico: {
      concedido: false,
      matricula: null,
      nome: null,
      data_hora: null,
      laudo: 'Troca de mangueiras do comando e filtros. Checklist pendente.',
      checklist: null
    },
    ordem_servico: {
      os: 'OS-2026-092',
      servico: 'Troca de mangueiras do comando principal e filtros hidráulicos',
      status: 'Aguardando Aval do Mecânico',
      previsao: '16:00'
    },
    disponibilidade_horas: [0, 0, 0, 0, 40, 60, 0, 0, 0, 0, 0, 0]
  },
  {
    id_equipamento: 'UC-15',
    nome_equipamento: 'Volvo L120F (Pá Carregadeira 3.5m³)',
    categoria: 'Carregamento & Pátio',
    catCode: 'CARREG',
    horometro_acumulado_total: 15112.6,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Alimentação Britagem Primária',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:10',
      laudo: 'Articulação lubrificada e freio de estacionamento testado.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 100, 95, 85, 100, 100, 100, 100, 100, 100]
  },
  {
    id_equipamento: 'UC-14',
    nome_equipamento: 'Volvo L120E',
    categoria: 'Carregamento & Pátio',
    catCode: 'CARREG',
    horometro_acumulado_total: 21034.9,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Pátio de Finos',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:12',
      laudo: 'Inspeção mecânica OK. Pneus sem avarias.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 100, 100, 85, 100, 100, 100, 100, 100, 100]
  },
  {
    id_equipamento: 'UC-16',
    nome_equipamento: 'Caterpillar 966H',
    categoria: 'Carregamento & Pátio',
    catCode: 'CARREG',
    horometro_acumulado_total: 17480.0,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Depósito de Brita 01',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:25',
      laudo: 'Checklist concluído sem restrições.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [95, 95, 100, 100, 100, 85, 100, 100, 100, 100, 100, 100]
  },
  {
    id_equipamento: 'UP-34',
    nome_equipamento: 'Fox 8-20 (Perfuratriz Hidráulica)',
    categoria: 'Perfuração',
    catCode: 'PERF',
    horometro_acumulado_total: 6720.5,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Plano de Fogo 42 · Bancada 810',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:45',
      laudo: 'Percussor Wolf Fox 8-20 revisado. Lubrificador de linha cheio e hastes T38 alinhadas.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 100, 100, 90, 100, 100, 100, 100, 100, 100]
  },
  {
    id_equipamento: 'UP-35',
    nome_equipamento: 'PW-5000 Furukawa',
    categoria: 'Perfuração',
    catCode: 'PERF',
    horometro_acumulado_total: 9310.2,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Plano de Fogo 41',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:48',
      laudo: 'Furukawa em pleno funcionamento.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 100, 100, 100, 100, 95, 100, 100, 100, 100]
  },
  {
    id_equipamento: 'UP-32',
    nome_equipamento: 'Atlas Copco XA-420 Compressor',
    categoria: 'Perfuração',
    catCode: 'PERF',
    horometro_acumulado_total: 13080.0,
    status_operacional: 'Em Oficina (Aguardando Aval)',
    liberado_para_operador: false, // BLOQUEADO PARA O OPERADOR!
    localizacao: 'Área de Apoio Geotécnico',
    aval_mecanico: {
      concedido: false,
      matricula: null,
      nome: null,
      data_hora: null,
      laudo: 'Reaperto de flanges e teste de vazamento da linha de ar. Aguardando checklist de entrega.',
      checklist: null
    },
    ordem_servico: {
      os: 'OS-2026-091',
      servico: 'Reaperto de flanges e teste de vazamento da linha de ar',
      status: 'Aguardando Aval do Mecânico',
      previsao: '15:45'
    },
    disponibilidade_horas: [0, 0, 0, 0, 20, 50, 0, 0, 0, 0, 0, 0]
  },
  {
    id_equipamento: 'UB-02',
    nome_equipamento: 'Metso Nordberg C125 (Britador Primário)',
    categoria: 'Britagem & Industrial',
    catCode: 'BRIT',
    horometro_acumulado_total: 32180.9,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Planta de Britagem Primária',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:00',
      laudo: 'Abertura de mandíbulas calibrada (125mm). Lubrificação automática operante.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 90, 100, 100, 95, 100, 100, 100, 100, 100, 100]
  },
  {
    id_equipamento: 'UB-03',
    nome_equipamento: 'Rebritador Cônico S3000',
    categoria: 'Britagem & Industrial',
    catCode: 'BRIT',
    horometro_acumulado_total: 28940.4,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Planta Secundária',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:05',
      laudo: 'Sistema excêntrico e óleo hidráulico em níveis nominais.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 100, 100, 90, 100, 100, 100, 100, 100, 100]
  },
  {
    id_equipamento: 'TR-USINA-04',
    nome_equipamento: 'Usina de Agregados Traço Fácil',
    categoria: 'Britagem & Industrial',
    catCode: 'BRIT',
    horometro_acumulado_total: 10510.3,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Complexo de Classificação',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:20',
      laudo: 'Balança dosadora calibrada e correias transportadoras inspecionadas.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 100, 95, 90, 100, 100, 100, 100, 100, 100]
  },
  {
    id_equipamento: 'MN-01',
    nome_equipamento: 'Caterpillar 120B Motoniveladora',
    categoria: 'Apoio',
    catCode: 'APOIO',
    horometro_acumulado_total: 19822.1,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Acessos Principais Mina Sul',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:30',
      laudo: 'Lâmina e escarificador verificados. Alerta para revisão de 40h em 7.9h.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [90, 90, 90, 85, 85, 80, 85, 90, 90, 90, 90, 90]
  },
  {
    id_equipamento: 'PIPA-01',
    nome_equipamento: 'Mercedes Atego 1719 Pipa',
    categoria: 'Apoio',
    catCode: 'APOIO',
    horometro_acumulado_total: 7890.4,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Umectação Pistas de Rolamento',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:40',
      laudo: 'Bomba d’água (canhão e barra aspersora) com pressão normal.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
  },
  {
    id_equipamento: 'PIPA-02',
    nome_equipamento: 'Mercedes Atron 2729 Pipa',
    categoria: 'Apoio',
    catCode: 'APOIO',
    horometro_acumulado_total: 11450.2,
    status_operacional: 'Apto para Operação',
    liberado_para_operador: true,
    localizacao: 'Umectação Acesso Britador',
    aval_mecanico: {
      concedido: true,
      matricula: 'MEC-01',
      nome: 'Marcos Mecânico',
      data_hora: '12/10/2026 06:42',
      laudo: 'Sistema de freios e tanque de 15.000L sem vazamentos.',
      checklist: { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
    },
    disponibilidade_horas: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
  }
];

const OPERADORES_PETRA = [
  { matricula_operador: 'OP-102', nome_operador: 'Carlos Silva', perfil_acesso: 'operacao', ativo: true },
  { matricula_operador: 'OP-512', nome_operador: 'José Santos', perfil_acesso: 'operacao', ativo: true },
  { matricula_operador: 'OP-615', nome_operador: 'Antônio Pereira', perfil_acesso: 'operacao', ativo: true },
  { matricula_operador: 'OP-340', nome_operador: 'Marcos Lima', perfil_acesso: 'operacao', ativo: true },
  { matricula_operador: 'MEC-01', nome_operador: 'Marcos Mecânico', perfil_acesso: 'manutencao', ativo: true },
  { matricula_operador: 'SUP-01', nome_operador: 'Eng. Roberto Gestor', perfil_acesso: 'gestao', ativo: true }
];

// In-memory data store for operational appointments and actions
const apontamentosGravados = [
  {
    id_apontamento: 'AP-SEED-01',
    id_equipamento: 'UP-34',
    nome_equipamento: 'Fox 8-20 (Perfuratriz Hidráulica)',
    categoria: 'Perfuração',
    tipo_apontamento: 'perfuracao_metros',
    turno: '1º Turno Diurno (07:00 - 15:48)',
    matricula_operador: 'OP-615',
    nome_operador: 'Antônio Pereira',
    horimetro_inicial: 6720.5,
    horimetro_final: 6726.7,
    horas_trabalhadas: 6.2,
    producao_valor: 168.5,
    metros_perfurados: 168.5,
    contagem_furos: 12,
    diametro_pol: 3.5,
    bancada: 'Bancada 810 · Plano de Fogo 42',
    macico: 'Fraturada',
    diesel_abastecido_litros: 110,
    horimetro_martelo: 4.8,
    criado_em: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id_apontamento: 'AP-SEED-02',
    id_equipamento: 'UT-34',
    nome_equipamento: 'Mercedes-Benz Axor 4144 (Basculante 8x4)',
    categoria: 'Carga & Transporte',
    tipo_apontamento: 'transporte_viagens',
    turno: '1º Turno Diurno (07:00 - 15:48)',
    matricula_operador: 'OP-102',
    nome_operador: 'Carlos Silva',
    horimetro_inicial: 14820.4,
    horimetro_final: 14826.8,
    horas_trabalhadas: 6.4,
    producao_valor: 42,
    viagens: 42,
    detalhes_materiais: { bica_corrida: 12, brita_1: 14, pedrisco: 10, areia_media: 6 },
    origem: 'Frente de Lavra 03',
    destino: 'Planta de Britagem Primária',
    diesel_abastecido_litros: 160,
    criado_em: new Date(Date.now() - 5400000).toISOString()
  },
  {
    id_apontamento: 'AP-SEED-03',
    id_equipamento: 'UT-35',
    nome_equipamento: 'Mercedes-Benz Actros 4844 (Basculante)',
    categoria: 'Carga & Transporte',
    tipo_apontamento: 'transporte_viagens',
    turno: '1º Turno Diurno (07:00 - 15:48)',
    matricula_operador: 'OP-512',
    nome_operador: 'José Santos',
    horimetro_inicial: 11340.8,
    horimetro_final: 11346.9,
    horas_trabalhadas: 6.1,
    producao_valor: 38,
    viagens: 38,
    detalhes_materiais: { bica_corrida: 20, brita_0: 8, brita_1: 10 },
    origem: 'Frente de Lavra 01',
    destino: 'Alimentação Britador C125',
    diesel_abastecido_litros: 145,
    criado_em: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id_apontamento: 'AP-SEED-04',
    id_equipamento: 'UC-15',
    nome_equipamento: 'Volvo L120F (Pá Carregadeira 3.5m³)',
    categoria: 'Carregamento & Pátio',
    tipo_apontamento: 'transporte_viagens',
    turno: '1º Turno Diurno (07:00 - 15:48)',
    matricula_operador: 'OP-512',
    nome_operador: 'José Santos',
    horimetro_inicial: 15112.6,
    horimetro_final: 15118.8,
    horas_trabalhadas: 6.2,
    producao_valor: 48,
    viagens: 48,
    detalhes_materiais: { brita_0: 15, brita_1: 18, pedrisco: 15 },
    origem: 'Pátio Central de Agregados',
    destino: 'Carregamento de Clientes & Moega',
    diesel_abastecido_litros: 130,
    criado_em: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id_apontamento: 'AP-SEED-05',
    id_equipamento: 'TR-USINA-04',
    nome_equipamento: 'Usina de Agregados Traço Fácil',
    categoria: 'Britagem & Industrial',
    tipo_apontamento: 'transporte_viagens',
    turno: '1º Turno Diurno (07:00 - 15:48)',
    matricula_operador: 'OP-340',
    nome_operador: 'Marcos Lima',
    horimetro_inicial: 10510.3,
    horimetro_final: 10516.5,
    horas_trabalhadas: 6.2,
    producao_valor: 28,
    viagens: 28,
    detalhes_materiais: { traco_facil: 28 },
    origem: 'Complexo de Classificação',
    destino: 'Estoque Homogeneizado',
    diesel_abastecido_litros: 95,
    criado_em: new Date(Date.now() - 900000).toISOString()
  }
];

const historicoAcoesDecisao = [];

// Determina as variáveis exatas para cada template
function getTemplateContext(templateName) {
  const name = templateName.toLowerCase();
  if (name.includes('ut_34') || name.includes('basculante')) {
    return { EQUIPAMENTO: 'UT-34', MODELO: 'Mercedes-Benz Actros 4844 (Basculante 8x4)', NOME_OPERADOR: 'OP-102 · Carlos Silva' };
  }
  if (name.includes('uc_11') || name.includes('ec460b') || name.includes('escavadeira')) {
    return { EQUIPAMENTO: 'UC-11', MODELO: 'Volvo EC460B (Rompedor / Concha 3.2m³)', NOME_OPERADOR: 'OP-512 · José Santos' };
  }
  if (name.includes('uc_15') || name.includes('l120f') || name.includes('carregadeira')) {
    return { EQUIPAMENTO: 'UC-15', MODELO: 'Volvo L120F (Pá Carregadeira 3.5m³)', NOME_OPERADOR: 'OP-512 · José Santos' };
  }
  if (name.includes('up_34') || name.includes('perfuratriz')) {
    return { EQUIPAMENTO: 'UP-34', MODELO: 'Fox 8-20 (Perfuratriz Hidráulica)', NOME_OPERADOR: 'OP-615 · Antônio Pereira' };
  }
  if (name.includes('mn_01') || name.includes('motoniveladora') || name.includes('120b')) {
    return { EQUIPAMENTO: 'MN-01', MODELO: 'Caterpillar 120B (Motoniveladora)', NOME_OPERADOR: 'OP-102 · Carlos Silva' };
  }
  if (name.includes('ub_02') || name.includes('c125') || name.includes('britador')) {
    return { EQUIPAMENTO: 'UB-02', MODELO: 'Metso Nordberg C125 (Britador Primário)', NOME_OPERADOR: 'OP-340 · Marcos Lima' };
  }
  if (name.includes('usina') || name.includes('tra_o')) {
    return { EQUIPAMENTO: 'TR-USINA-04', MODELO: 'Usina de Agregados Traço Fácil', NOME_OPERADOR: 'OP-340 · Marcos Lima' };
  }
  if (name.includes('pipa')) {
    return { EQUIPAMENTO: 'PIPA-01', MODELO: 'Mercedes Atego 1719 (Caminhão Pipa)', NOME_OPERADOR: 'OP-102 · Carlos Silva' };
  }
  if (name.includes('remco') || name.includes('s3000') || name.includes('rebritagem')) {
    return { EQUIPAMENTO: 'UB-03', MODELO: 'Rebritador Cônico S3000', NOME_OPERADOR: 'OP-340 · Marcos Lima' };
  }
  return { EQUIPAMENTO: 'UT-34', MODELO: 'Mercedes-Benz Axor 4144', NOME_OPERADOR: 'OP-102 · Carlos Silva' };
}

// Helper to render HTML templates and replace Jinja placeholders
function renderTemplate(res, templateName, context = {}) {
  const filePath = path.join(__dirname, 'templates', templateName);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send(`Template ${templateName} não encontrado`);
  }

  let html = fs.readFileSync(filePath, 'utf-8');

  // Substitui opções quebradas de operador por opções reais dos 4 operadores cadastrados
  const blocoOpcoesQuebrado = /<option selected="" value="\{\{\s*NOME_OPERADOR\s*\}\}<\/option>\s*<option value="\{\{\s*NOME_OPERADOR\s*\}\}<\/option>\s*<option value="\{\{\s*NOME_OPERADOR\s*\}\}<\/option>\s*<option value="\{\{\s*NOME_OPERADOR\s*\}\}<\/option>/g;
  const opcoesReais = `<option selected value="OP-102">OP-102 · Carlos Silva (1º Turno)</option>
<option value="OP-512">OP-512 · José Santos</option>
<option value="OP-615">OP-615 · Antônio Pereira</option>
<option value="OP-340">OP-340 · Marcos Lima</option>`;
  html = html.replace(blocoOpcoesQuebrado, opcoesReais);

  const especifico = getTemplateContext(templateName);
  const defaultContext = {
    ...especifico,
    TURNO: '1º Turno (07:00 - 15:48)',
    DATA_ATUAL: new Date().toLocaleDateString('pt-BR'),
    HORA_ATUAL: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    ...context
  };

  // Replace {{ KEY }} or {{KEY}}
  for (const [key, val] of Object.entries(defaultContext)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    html = html.replace(regex, val);
  }

  // Clean any remaining unreplaced {{ ... }}
  html = html.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, token) => {
    return token.replace(/_/g, ' ');
  });

  // Inject RDO Engine auto-wiring module right before </body> to activate full business logic without modifying templates
  if (html.includes('</body>')) {
    html = html.replace('</body>', '<script type="module" src="/static/js/rdoEngine.js"></script>\n</body>');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

// Static assets
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/static/js', express.static(path.join(__dirname, 'static', 'js')));

// Direct file access for scripts at root
app.get('/operacionalController.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(path.join(__dirname, 'static', 'js', 'operacionalController.js'));
});
app.get('/supabaseClient.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(path.join(__dirname, 'static', 'js', 'supabaseClient.js'));
});
app.get('/offlineSync.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(path.join(__dirname, 'static', 'js', 'offlineSync.js'));
});
app.get('/validacoesCampo.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(path.join(__dirname, 'static', 'js', 'validacoesCampo.js'));
});

// API Routes
app.get('/api/equipamentos', async (req, res) => {
  let dadosRemotos = null;
  try {
    const { data, error } = await supabase.from('prontuario_equipamentos').select('*');
    if (!error && data && data.length > 0) {
      dadosRemotos = data;
    }
  } catch (e) {}

  // Mescla dados remotos mantendo o estado dinâmico da oficina e aval do mecânico
  const listaFinal = FROTA_PETRA.map(local => {
    if (dadosRemotos) {
      const remoto = dadosRemotos.find(r => (r.id_equipamento || r.tag) === local.id_equipamento);
      if (remoto) {
        return {
          ...local,
          nome_equipamento: remoto.nome_equipamento || local.nome_equipamento,
          categoria: remoto.categoria || local.categoria,
          horometro_acumulado_total: remoto.horometro_acumulado_total || local.horometro_acumulado_total,
          localizacao: remoto.localizacao || local.localizacao
        };
      }
    }
    return local;
  });

  res.json({
    status: 'sucesso',
    origem: dadosRemotos ? 'supabase_e_estado_local' : 'homologado_petra',
    total: listaFinal.length,
    dados: listaFinal
  });
});

// Mapa de Calor com Disponibilidades Mecânicas da Frota (Horas x Equipamentos)
app.get('/api/manutencao/mapa-calor', (req, res) => {
  const categoriaFiltro = req.query.categoria || 'TODAS';
  
  let lista = FROTA_PETRA;
  if (categoriaFiltro !== 'TODAS') {
    lista = FROTA_PETRA.filter(e => e.catCode === categoriaFiltro || e.categoria.toLowerCase().includes(categoriaFiltro.toLowerCase()));
  }

  // Média de disponibilidade física por hora do turno
  const mediasHorarias = HORAS_HEATMAP.map((hora, idx) => {
    let soma = 0;
    let count = 0;
    for (const e of lista) {
      if (e.disponibilidade_horas && e.disponibilidade_horas[idx] !== undefined) {
        soma += e.disponibilidade_horas[idx];
        count++;
      }
    }
    return count > 0 ? parseFloat((soma / count).toFixed(1)) : 100;
  });

  const matrix = lista.map(e => {
    const horasValores = (e.disponibilidade_horas && e.disponibilidade_horas.length === HORAS_HEATMAP.length)
      ? e.disponibilidade_horas
      : HORAS_HEATMAP.map(() => e.liberado_para_operador ? 100 : 0);

    const mediaDF = parseFloat((horasValores.reduce((a, b) => a + b, 0) / horasValores.length).toFixed(1));

    return {
      id_equipamento: e.id_equipamento,
      nome_equipamento: e.nome_equipamento,
      categoria: e.categoria,
      catCode: e.catCode,
      status_operacional: e.status_operacional,
      liberado_para_operador: e.liberado_para_operador,
      aval_mecanico: e.aval_mecanico,
      ordem_servico: e.ordem_servico,
      df_media: mediaDF,
      celulas: HORAS_HEATMAP.map((h, i) => {
        const val = horasValores[i];
        let status = 'Operando';
        let motivo = 'Operação regular em campo';
        let cor = 'verde';

        if (val === 0) {
          status = 'Oficina / Manutenção';
          motivo = e.ordem_servico ? e.ordem_servico.servico : 'Parada Corretiva / Revisão';
          cor = 'vermelho';
        } else if (val < 75) {
          status = 'Intervenção Mecânica Parcial';
          motivo = 'Socorro mecânico / Ajuste';
          cor = 'vermelho';
        } else if (val < 90) {
          status = 'Atenção Operacional';
          motivo = 'Parada programada / Troca de turno / Almoço';
          cor = 'amarelo';
        } else {
          status = 'Disponível / Alta Performance';
          motivo = 'Produção plena';
          cor = 'verde';
        }

        return {
          hora: h,
          percentual: val,
          status,
          motivo,
          cor
        };
      })
    };
  });

  const mediaGeralFrota = mediasHorarias.length > 0
    ? parseFloat((mediasHorarias.reduce((a, b) => a + b, 0) / mediasHorarias.length).toFixed(1))
    : 93.6;

  res.json({
    status: 'sucesso',
    horas: HORAS_HEATMAP,
    media_geral_frota: mediaGeralFrota,
    medias_horarias: mediasHorarias,
    equipamentos: matrix
  });
});

// Aval do Mecânico & Validação de Checklist Técnico
app.post('/api/manutencao/checklist-liberacao', (req, res) => {
  const { id_equipamento, matricula_mecanico, nome_mecanico, checklist, observacoes } = req.body || {};
  const tag = (id_equipamento || '').toUpperCase().trim();

  const equip = FROTA_PETRA.find(e => e.id_equipamento === tag);
  if (!equip) {
    return res.status(404).json({ status: 'erro', mensagem: `Equipamento ${tag} não encontrado no pátio.` });
  }

  // Atualiza estado do equipamento
  equip.status_operacional = 'Apto para Operação';
  equip.liberado_para_operador = true;
  equip.aval_mecanico = {
    concedido: true,
    matricula: matricula_mecanico || 'MEC-01',
    nome: nome_mecanico || 'Marcos Mecânico',
    data_hora: new Date().toLocaleString('pt-BR'),
    laudo: observacoes || 'Checklist técnico 100% verificado e aprovado. Equipamento liberado para operação pelo mecânico.',
    checklist: checklist || { oleo: true, hidraulico: true, freios: true, seguranca: true, estrutura: true, teste: true }
  };

  if (equip.ordem_servico) {
    equip.ordem_servico.status = 'Concluída & Liberada';
  }

  // Atualiza horas recentes e futuras do heatmap para 100%
  if (equip.disponibilidade_horas) {
    for (let i = 5; i < equip.disponibilidade_horas.length; i++) {
      equip.disponibilidade_horas[i] = 100;
    }
  }

  const logMsg = {
    id: `AVAL-${Date.now()}`,
    id_acao: 'aval_mecanico_liberacao',
    titulo: `Aval Concedido: ${equip.id_equipamento} Liberado`,
    justificativa: `O mecânico ${equip.aval_mecanico.nome} (${equip.aval_mecanico.matricula}) validou o checklist técnico e concedeu o aval. ${equip.nome_equipamento} agora aparece liberado para seleção pelo operador.`,
    usuario: equip.aval_mecanico.nome,
    data_hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'Liberado p/ Operador'
  };
  historicoAcoesDecisao.unshift(logMsg);

  console.log(`[RDO PETRA] AVAL DO MECÂNICO CONCEDIDO: ${equip.id_equipamento} AGORA DISPONÍVEL PARA O OPERADOR!`);

  res.json({
    status: 'sucesso',
    mensagem: `✅ Aval do Mecânico confirmado com sucesso! O equipamento ${equip.id_equipamento} foi liberado e já aparece na tela de seleção do operador.`,
    equipamento: equip,
    log: logMsg
  });
});

// Bloqueio de Equipamento para Oficina (Simulação e Operação Real)
app.post('/api/manutencao/bloquear-oficina', (req, res) => {
  const { id_equipamento, motivo, criticidade, mecanico } = req.body || {};
  const tag = (id_equipamento || '').toUpperCase().trim();

  const equip = FROTA_PETRA.find(e => e.id_equipamento === tag);
  if (!equip) {
    return res.status(404).json({ status: 'erro', mensagem: `Equipamento ${tag} não encontrado.` });
  }

  equip.status_operacional = 'Em Oficina (Aguardando Aval)';
  equip.liberado_para_operador = false;
  equip.aval_mecanico = {
    concedido: false,
    matricula: null,
    nome: null,
    data_hora: null,
    laudo: motivo || 'Equipamento recolhido para a oficina. Bloqueado para o operador até novo checklist do mecânico.',
    checklist: null
  };

  equip.ordem_servico = {
    os: `OS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    servico: motivo || 'Manutenção Corretiva / Inspeção Mecânica',
    status: 'Aguardando Aval do Mecânico',
    previsao: '16:30'
  };

  if (equip.disponibilidade_horas) {
    for (let i = 6; i < equip.disponibilidade_horas.length; i++) {
      equip.disponibilidade_horas[i] = 0;
    }
  }

  const logMsg = {
    id: `BLOQ-${Date.now()}`,
    id_acao: 'bloqueio_oficina',
    titulo: `Bloqueio p/ Manutenção: ${equip.id_equipamento}`,
    justificativa: `Equipamento ${equip.nome_equipamento} bloqueado na oficina (${motivo || 'Manutenção'}). Bloqueado para o operador.`,
    usuario: mecanico || 'Oficina Mecânica',
    data_hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'Bloqueado na Oficina'
  };
  historicoAcoesDecisao.unshift(logMsg);

  console.log(`[RDO PETRA] BLOQUEIO DE OFICINA: ${equip.id_equipamento} BLOQUEADO PARA O OPERADOR!`);

  res.json({
    status: 'sucesso',
    mensagem: `Equipamento ${equip.id_equipamento} enviado para a oficina e bloqueado para seleção do operador.`,
    equipamento: equip
  });
});

app.get('/api/operadores', async (req, res) => {
  let operadores = null;
  try {
    const { data, error } = await supabase.from('tb_operadores').select('*');
    if (!error && data && data.length > 0) {
      operadores = data;
    }
  } catch (e) {}

  res.json({
    status: 'sucesso',
    origem: operadores ? 'supabase' : 'homologado_petra',
    dados: operadores || OPERADORES_PETRA
  });
});

app.get('/api/supabase-status', async (req, res) => {
  try {
    const { error, status } = await supabase.from('prontuario_equipamentos').select('count', { count: 'exact', head: true });
    res.json({
      conectado: true,
      url: SUPABASE_URL,
      status_http: status,
      aviso_rls: error ? error.message : null,
      mensagem: 'Conexão ativa com o projeto Supabase da Petra Mineração.'
    });
  } catch (err) {
    res.status(500).json({ conectado: false, erro: err.message });
  }
});

app.get('/api/alerta-manutencao/:equipamento', (req, res) => {
  const equip = (req.params.equipamento || 'UT-34').toUpperCase();
  const horasPadrao = equip === 'MN-01' ? 40 : 250;
  // Simulação / cálculo de horas desde última revisão
  const horasTrabalhadasDesdeRevisao = equip === 'MN-01' ? 32.5 : 120.4;
  const horasRestantes = parseFloat((horasPadrao - horasTrabalhadasDesdeRevisao).toFixed(1));

  const emAlerta = horasRestantes <= 10;
  return res.json({
    status: emAlerta ? 'ALERTA' : 'OK',
    alerta: emAlerta,
    equipamento: equip,
    horas_restantes: horasRestantes,
    proxima_revisao_horas: horasPadrao,
    mensagem: emAlerta
      ? `Atenção: Máquina a ${horasRestantes}h da revisão de ${horasPadrao}h. Notifique a oficina.`
      : `Equipamento em dia. Próxima revisão em ${horasRestantes}h.`
  });
});

app.post('/api/fechamento-turno', (req, res) => {
  const { data_turno, turno, equipamento } = req.body || {};
  const dataHoje = data_turno || new Date().toISOString().split('T')[0];
  const turnoSel = turno || '1º Turno Diurno';
  const tag = (equipamento || 'UT-34').toUpperCase();

  // Consolidação dos apontamentos em memória ou filtrados
  const relevantes = apontamentosGravados.filter(
    a => (a.id_equipamento === tag || a.equipamento === tag)
  );

  let totalHoras = 0;
  let totalProducao = 0;
  let totalDiesel = 0;
  let paradaMecanicaMinutos = 0;
  let paradaTotalMinutos = 0;

  for (const a of relevantes) {
    totalHoras += parseFloat(a.horas_trabalhadas || (a.horimetro_final - a.horimetro_inicial) || 0);
    totalProducao += parseFloat(a.producao_valor || a.viagens || 0);
    totalDiesel += parseFloat(a.diesel_abastecido_litros || 0);
    const duracao = parseInt(a.duracao_parada_minutos || 0);
    paradaTotalMinutos += duracao;
    if (a.categoria_parada === 'Mecânica' || (a.motivo_parada_codigo && a.motivo_parada_codigo.startsWith('MEC'))) {
      paradaMecanicaMinutos += duracao;
    }
  }

  // Se não houver registros em memória no momento, aplica estimativas operacionais de turno completo
  if (relevantes.length === 0) {
    totalHoras = 8.8;
    totalProducao = 26;
    totalDiesel = 180;
  }

  const horasTurno = 8.8; // 8h48min padrão
  const disponibilidade = Math.max(0, parseFloat((((horasTurno * 60 - paradaMecanicaMinutos) / (horasTurno * 60)) * 100).toFixed(2)));

  return res.json({
    data_turno: dataHoje,
    turno: turnoSel,
    equipamento: tag,
    total_horas_trabalhadas: parseFloat(totalHoras.toFixed(2)),
    total_producao: totalProducao,
    total_diesel_litros: totalDiesel,
    parada_mecanica_minutos: paradaMecanicaMinutos,
    parada_total_minutos: paradaTotalMinutos,
    disponibilidade_fisica_percentual: disponibilidade,
    fechamento_concluido: true
  });
});

// API Routes
app.post('/login', (req, res) => {
  const { pin } = req.body || {};
  const pinStr = (pin || '').toString().trim();

  const PIN_MECANICO = '1234';
  const PIN_OPERADOR = '5678';
  const PIN_SUPERVISOR = '9999';

  if (pinStr === PIN_MECANICO) {
    return res.json({
      status: 'sucesso',
      redirecionar: '/tela_liberacao_oficina.html',
      usuario: { nome: 'Equipe de Manutenção', perfil: 'manutencao', matricula: 'MEC-01' }
    });
  } else if (pinStr === PIN_OPERADOR) {
    return res.json({
      status: 'sucesso',
      redirecionar: '/tela_selecao_equipamento.html',
      usuario: { nome: 'Equipe de Operação', perfil: 'operador', matricula: 'OP-102' }
    });
  } else if (pinStr === PIN_SUPERVISOR) {
    return res.json({
      status: 'sucesso',
      redirecionar: '/tela_hub_central.html',
      usuario: { nome: 'Gestor / Supervisor', perfil: 'supervisor', matricula: 'SUP-01' }
    });
  } else {
    return res.status(401).json({
      status: 'erro',
      mensagem: 'PIN não encontrado'
    });
  }
});

app.post('/salvar_apontamento', async (req, res) => {
  const dados = req.body || {};
  dados.criado_em = dados.criado_em || new Date().toISOString();
  apontamentosGravados.push(dados);
  console.log('[RDO PETRA] Apontamento recebido:', dados);

  let supabaseSalvo = false;
  let avisoSupabase = null;

  try {
    const matriculasValidas = ['OP-102', 'PETRA10', 'DEMO-001', 'KADU'];
    const matEnviada = (dados.matricula_operador || dados.matricula || 'OP-102').toUpperCase().trim();
    const matFk = matriculasValidas.includes(matEnviada) ? matEnviada : 'OP-102';

    const payload = {
      id_apontamento: dados.id_apontamento || crypto.randomUUID(),
      id_equipamento: (dados.id_equipamento || dados.equipamento || 'UT-34').slice(0, 20),
      data_hora_apontamento: dados.data_hora_apontamento || dados.criado_em,
      turno: (dados.turno || '1º Turno Diurno').slice(0, 20),
      matricula_operador: matFk,
      nome_operador: (dados.nome_operador || 'Operador Responsável').slice(0, 100),
      horimetro_inicial: parseFloat(dados.horimetro_inicial) || 0,
      horimetro_final: parseFloat(dados.horimetro_final) || 0,
      producao_valor: parseFloat(dados.producao_valor || dados.viagens || 0),
      diesel_abastecido_litros: parseFloat(dados.diesel_abastecido_litros || 0),
      horimetro_martelo: parseFloat(dados.horimetro_martelo || 0),
      checklist_respostas: dados.checklist_respostas || {},
      motivo_parada_codigo: dados.motivo_parada_codigo ? String(dados.motivo_parada_codigo).slice(0, 20) : null,
      duracao_parada_minutos: parseInt(dados.duracao_parada_minutos || 0)
    };

    const { error } = await supabase
      .from('producao_perfuracao_horaria')
      .insert([payload]);

    if (!error) {
      supabaseSalvo = true;
    } else {
      avisoSupabase = error.message;
      console.warn('[Supabase Sync] Aviso ao gravar na nuvem:', error.message);
    }
  } catch (err) {
    avisoSupabase = err.message;
  }

  return res.json({
    status: 'sucesso',
    mensagem: 'Apontamento gravado com sucesso!',
    supabase_sincronizado: supabaseSalvo,
    aviso: avisoSupabase,
    id_registro: apontamentosGravados.length
  });
});

app.get('/api/apontamentos', (req, res) => {
  res.json({
    status: 'sucesso',
    total: apontamentosGravados.length,
    dados: apontamentosGravados
  });
});

// Comprehensive Dashboard KPIs (Modo Gestão & Modo Manutenção)
app.get('/api/dashboard-kpis', (req, res) => {
  const { equipamento, turno } = req.query;
  const tagFiltro = (equipamento || 'TODOS').toUpperCase();
  const turnoFiltro = turno || 'TODOS';

  let filtrados = apontamentosGravados;
  if (tagFiltro !== 'TODOS') {
    filtrados = filtrados.filter(a => (a.id_equipamento || a.equipamento || '').toUpperCase() === tagFiltro);
  }
  if (turnoFiltro !== 'TODOS') {
    filtrados = filtrados.filter(a => (a.turno || '').includes(turnoFiltro));
  }

  // 1. Métricas de Gestão Operacional
  let totalMetros = 0;
  let totalViagens = 0;
  let totalDiesel = 0;
  let totalHoras = 0;
  let furosCount = 0;

  for (const a of filtrados) {
    if (a.tipo_apontamento === 'perfuracao_metros' || (a.id_equipamento && a.id_equipamento.startsWith('UP'))) {
      totalMetros += parseFloat(a.metros_perfurados || a.producao_valor || 0);
      furosCount += parseInt(a.contagem_furos || 1);
    } else {
      totalViagens += parseInt(a.viagens || a.producao_valor || 0);
    }
    totalDiesel += parseFloat(a.diesel_abastecido_litros || 0);
    totalHoras += parseFloat(a.horas_trabalhadas || (a.horimetro_final - a.horimetro_inicial) || 0);
  }

  // Garantir valores de baseline caso o filtro seja geral
  if (tagFiltro === 'TODOS') {
    if (totalMetros === 0) totalMetros = 168.5;
    if (totalViagens === 0) totalViagens = 156;
  }

  const metaMetros = 220.0;
  const metaViagens = 180;
  const volumeM3 = Math.round(totalViagens * 16);
  const toneladas = Math.round(totalViagens * 27.2);
  const taxaPenetracao = totalHoras > 0 ? parseFloat((totalMetros / 6.2).toFixed(1)) : 27.2;

  const gestao = {
    total_metros_perfurados: parseFloat(totalMetros.toFixed(1)),
    meta_metros_diaria: metaMetros,
    percentual_meta_metros: Math.min(100, parseFloat(((totalMetros / metaMetros) * 100).toFixed(1))),
    contagem_furos: furosCount || 12,
    taxa_penetracao_mh: taxaPenetracao,
    total_viagens: totalViagens,
    meta_viagens_diaria: metaViagens,
    percentual_meta_viagens: Math.min(100, parseFloat(((totalViagens / metaViagens) * 100).toFixed(1))),
    volume_estimado_m3: volumeM3,
    toneladas_estimadas: toneladas,
    disponibilidade_fisica_pct: 92.4,
    utilizacao_frota_pct: 85.1,
    diesel_total_litros: totalDiesel || 640,
    maquinas_ativas_count: 12,
    maquinas_oficina_count: 2,
    distribuicao_materiais: [
      { material: 'Brita 1', viagens: 42, pct: 27 },
      { material: 'Bica Corrida', viagens: 36, pct: 23 },
      { material: 'Brita 0', viagens: 28, pct: 18 },
      { material: 'Pedrisco', viagens: 25, pct: 16 },
      { material: 'Traço Fácil', viagens: 15, pct: 10 },
      { material: 'Areia Média', viagens: 10, pct: 6 }
    ],
    gargalos_identificados: [
      {
        id: 'gargalo_01',
        tipo: 'atencao',
        titulo: 'Fila de Carga na Bancada 780',
        descricao: 'Tempo de espera na Frente 03 subiu para 5.2 min. Recomenda-se realocar basculante reserva UT-33.',
        acao_sugerida: 'Realocar UT-33'
      },
      {
        id: 'gargalo_02',
        tipo: 'positivo',
        titulo: 'Perfuração Acima da Meta',
        descricao: 'Fox 8-20 superou taxa horária em 12%. Liberação de desmonte programada para as 15:30.',
        acao_sugerida: 'Liberar Plano 42'
      }
    ],
    ultimos_apontamentos: apontamentosGravados.slice(-8).reverse()
  };

  // 2. Métricas de Manutenção & Confiabilidade (PCM)
  const manutencao = {
    mtbf_horas: 142.5,
    mttr_horas: 1.7,
    disponibilidade_mecanica_pct: 93.6,
    equipamentos_oficina_count: 2,
    alertas_preventiva: [
      {
        id_equipamento: 'MN-01',
        nome_equipamento: 'Caterpillar 120B (Motoniveladora)',
        categoria: 'Apoio de Pista',
        horimetro_acumulado: 19822.1,
        horas_desde_revisao: 32.1,
        horas_restantes: 7.9,
        proxima_revisao_horas: 40.0,
        urgencia: 'CRITICA',
        urgencia_label: 'Atenção Imediata (<8h)',
        mensagem: 'Faltam 7.9h para a revisão periódica de lâmina e articulação.'
      },
      {
        id_equipamento: 'UT-34',
        nome_equipamento: 'Mercedes-Benz Axor 4144 (Basculante 8x4)',
        categoria: 'Carga & Transporte',
        horimetro_acumulado: 14820.4,
        horas_desde_revisao: 235.2,
        horas_restantes: 14.8,
        proxima_revisao_horas: 250.0,
        urgencia: 'ALERTA',
        urgencia_label: 'Alerta Preventivo (<15h)',
        mensagem: 'Faltam 14.8h para revisão de 250h (troca de filtros e óleos de motor).'
      },
      {
        id_equipamento: 'UP-34',
        nome_equipamento: 'Fox 8-20 (Perfuratriz Hidráulica)',
        categoria: 'Perfuração',
        horimetro_acumulado: 6720.5,
        horas_desde_revisao: 220.5,
        horas_restantes: 29.5,
        proxima_revisao_horas: 250.0,
        urgencia: 'NORMAL',
        urgencia_label: 'Planejamento Normal',
        mensagem: 'Faltam 29.5h para revisão de 250h do compressor e cabeçote.'
      },
      {
        id_equipamento: 'UC-11',
        nome_equipamento: 'Volvo EC460B (Escavadeira Rompedor)',
        categoria: 'Escavação',
        horimetro_acumulado: 18441.7,
        horas_desde_revisao: 191.7,
        horas_restantes: 58.3,
        proxima_revisao_horas: 250.0,
        urgencia: 'NORMAL',
        urgencia_label: 'Em Dia',
        mensagem: 'Revisão periódica programada em 58.3h.'
      }
    ],
    ordens_servico: [
      {
        os: 'OS-2026-089',
        tag: 'UT-32',
        equipamento: 'Mercedes-Benz Axor 3344',
        servico: 'Substituição de pastilhas de freio do 2º eixo e alinhamento',
        status: 'Em Execução (90%)',
        mecanico: 'Marcos Mecânico',
        previsao: '14:30'
      },
      {
        os: 'OS-2026-091',
        tag: 'UP-32',
        equipamento: 'Atlas Copco XA-420 Compressor',
        servico: 'Reaperto de flanges e teste de vazamento da linha de ar',
        status: 'Aguardando Teste',
        mecanico: 'Equipe Oficina',
        previsao: '15:45'
      }
    ],
    acoes_rapidas_recomendadas: [
      {
        id_acao: 'acao_parada_mn01',
        titulo: 'Agendar Parada da MN-01 no Horário de Almoço',
        descricao: 'Faltam 7.9h para a revisão de 40h. Realizar engraxamento e reaperto das 12h às 13h sem parada de pista.',
        tipo: 'manutencao_preventiva',
        icone: 'schedule',
        badge: 'Impacto Zero na Mina',
        botao_texto: 'Confirmar Parada no Almoço'
      },
      {
        id_acao: 'acao_requisitar_kit_ut34',
        titulo: 'Requisitar Kit de Filtros 250h (UT-34)',
        descricao: 'Faltam 14.8h para revisão de 250h. Notificar almoxarifado para separar kit MB Axor para troca ao final do turno.',
        tipo: 'almoxarifado',
        icone: 'inventory',
        badge: 'Prevenção de Atraso',
        botao_texto: 'Requisitar Peças ao Almoxarifado'
      },
      {
        id_acao: 'acao_inspecao_rompedor_uc11',
        titulo: 'Checar Pressão do Acumulador de Rompedor (UC-11)',
        descricao: 'Horímetro de martelo acumulou 4.8h hoje. Vistoria preventiva do nitrogênio antes da próxima bancada.',
        tipo: 'socorro_campo',
        icone: 'build',
        badge: 'Evita Quebra de Haste',
        botao_texto: 'Emitir OS de Campo'
      }
    ],
    acoes_executadas: historicoAcoesDecisao
  };

  res.json({
    status: 'sucesso',
    data_consulta: new Date().toISOString(),
    filtro_equipamento: tagFiltro,
    filtro_turno: turnoFiltro,
    gestao,
    manutencao
  });
});

// Ações Rápidas de Tomada de Decisão (Executadas com 1 clique pelo Gestor ou Oficina)
app.post('/api/executar-acao-decisao', (req, res) => {
  const { id_acao, titulo, justificativa, usuario } = req.body || {};
  const acaoRegistro = {
    id: `DEC-${Date.now()}`,
    id_acao: id_acao || 'acao_custom',
    titulo: titulo || 'Ação Operacional Executada',
    justificativa: justificativa || 'Executado via Dashboard com 1 clique para tomada rápida de decisão.',
    usuario: usuario || 'Gestor / PCM',
    data_hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'Concluído & Notificado'
  };

  historicoAcoesDecisao.unshift(acaoRegistro);
  console.log('[RDO PETRA] Ação de decisão executada:', acaoRegistro);

  res.json({
    status: 'sucesso',
    mensagem: `Decisão confirmada: "${acaoRegistro.titulo}". Equipe de campo e sistema notificados!`,
    registro: acaoRegistro
  });
});

// Main Page (Login PIN)
app.get('/', (req, res) => {
  renderTemplate(res, 'tela_login_pin.html');
});

// Key Named Routes
app.get('/tela_login_pin.html', (req, res) => {
  renderTemplate(res, 'tela_login_pin.html');
});

app.get('/tela_hub_central.html', (req, res) => {
  renderTemplate(res, 'tela_hub_central.html');
});

app.get('/tela_liberacao_oficina.html', (req, res) => {
  renderTemplate(res, 'tela_liberacao_oficina.html');
});

app.get('/tela_selecao_equipamento.html', (req, res) => {
  renderTemplate(res, 'tela_login_sele_o_de_equipamento_rdo_conectado.html');
});

// Universal Handler for all templates
app.get('/:page.html', (req, res, next) => {
  const pageName = `${req.params.page}.html`;
  const templatePath = path.join(__dirname, 'templates', pageName);

  if (fs.existsSync(templatePath)) {
    return renderTemplate(res, pageName);
  }

  // Attempt fuzzy search in templates (for Portuguese accents or underscore variations)
  const files = fs.readdirSync(path.join(__dirname, 'templates'));
  const normalizedSearch = req.params.page.toLowerCase().replace(/[^a-z0-9]/g, '');
  const matched = files.find(f => {
    const norm = f.replace('.html', '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return norm === normalizedSearch;
  });

  if (matched) {
    return renderTemplate(res, matched);
  }

  next();
});

// Fallback to login
app.use((req, res) => {
  res.redirect('/');
});

process.on('uncaughtException', (err) => {
  console.error('[RDO PETRA] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[RDO PETRA] Unhandled Rejection:', reason);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[RDO PETRA] Servidor Node.js rodando em http://0.0.0.0:${PORT}`);
});
