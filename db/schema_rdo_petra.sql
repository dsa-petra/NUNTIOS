-- =========================================================================
-- ESQUEMA RELACIONAL & SERVIÇOS BACKEND (SUPABASE / POSTGRESQL 15+)
-- PROJETO: RDO DIGITAL - PETRA MINERAÇÃO
-- =========================================================================

-- 1. EXTENSÃO UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA: tb_operadores
CREATE TABLE IF NOT EXISTS public.tb_operadores (
    matricula_operador VARCHAR(50) PRIMARY KEY,
    nome_operador VARCHAR(150) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil_acesso VARCHAR(50) NOT NULL DEFAULT 'operacao', -- 'operacao', 'manutencao', 'gestao'
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Carga inicial de operadores da Petra
INSERT INTO public.tb_operadores (matricula_operador, nome_operador, senha_hash, perfil_acesso, ativo)
VALUES
    ('OP-102', 'Carlos Silva (Operador Mina)', '5678', 'operacao', TRUE),
    ('OP-512', 'José Santos (Basculante/Pá)', '5678', 'operacao', TRUE),
    ('OP-615', 'Antônio Pereira (Perfuratriz)', '5678', 'operacao', TRUE),
    ('MEC-01', 'Marcos Mecânico (Oficina Central)', '1234', 'manutencao', TRUE),
    ('SUP-01', 'Eng. Roberto Gestor (Supervisão Mina)', '9999', 'gestao', TRUE)
ON CONFLICT (matricula_operador) DO UPDATE 
SET nome_operador = EXCLUDED.nome_operador, senha_hash = EXCLUDED.senha_hash;

-- 3. TABELA: prontuario_equipamentos
CREATE TABLE IF NOT EXISTS public.prontuario_equipamentos (
    id_equipamento VARCHAR(50) PRIMARY KEY, -- ex: 'UT-34', 'UC-11', 'UP-34', 'MN-01', 'UB-02'
    nome_equipamento VARCHAR(150) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    localizacao VARCHAR(150) DEFAULT 'Mina Sul',
    status_operacional VARCHAR(50) DEFAULT 'Apto para Operação',
    
    -- Atributos de Checklist Dinâmico
    requer_oleo_motor BOOLEAN DEFAULT TRUE,
    requer_oleo_hidraulico BOOLEAN DEFAULT TRUE,
    requer_nivel_arrefecimento BOOLEAN DEFAULT TRUE,
    requer_sistema_freios BOOLEAN DEFAULT TRUE,
    requer_pressao_pneus BOOLEAN DEFAULT FALSE,
    requer_esteira_rodante BOOLEAN DEFAULT FALSE,
    requer_vazamento_mangueiras BOOLEAN DEFAULT TRUE,
    requer_pressao_compressor BOOLEAN DEFAULT FALSE,
    requer_horimetro_martelo BOOLEAN DEFAULT FALSE,
    requer_itens_seguranca BOOLEAN DEFAULT TRUE,
    
    -- Metas Operacionais
    capacidade_historica_hora NUMERIC(10,2) DEFAULT 15.00,
    meta_consumo_hora NUMERIC(10,2) DEFAULT 25.00,
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Carga inicial da frota Petra Mineração
INSERT INTO public.prontuario_equipamentos (id_equipamento, nome_equipamento, categoria, requer_pressao_pneus, requer_esteira_rodante, requer_pressao_compressor, requer_horimetro_martelo)
VALUES
    ('UT-34', 'Mercedes-Benz Actros 4844 (Basculante 8x4)', 'Carga & Transporte', TRUE, FALSE, FALSE, FALSE),
    ('UC-11', 'Volvo EC460B (Escavadeira Rompedor / Concha)', 'Escavação', FALSE, TRUE, FALSE, TRUE),
    ('UC-15', 'Volvo L120F (Pá Carregadeira 3.5m³)', 'Carregamento & Pátio', TRUE, FALSE, FALSE, FALSE),
    ('UP-34', 'Fox 8-20 (Perfuratriz Hidráulica)', 'Perfuração', FALSE, TRUE, TRUE, TRUE),
    ('MN-01', 'Caterpillar 120B (Motoniveladora)', 'Apoio', TRUE, FALSE, FALSE, FALSE),
    ('UB-02', 'Metso Nordberg C125 (Britador Primário)', 'Britagem & Industrial', FALSE, FALSE, FALSE, FALSE),
    ('TR-USINA-04', 'Usina de Agregados Traço Fácil', 'Industrial', FALSE, FALSE, FALSE, FALSE),
    ('PIPA-01', 'Mercedes Atego 1719 (Caminhão Pipa)', 'Apoio', TRUE, FALSE, FALSE, FALSE)
ON CONFLICT (id_equipamento) DO UPDATE 
SET nome_equipamento = EXCLUDED.nome_equipamento;

-- 4. TABELA: relogio_manutencao
CREATE TABLE IF NOT EXISTS public.relogio_manutencao (
    id_equipamento VARCHAR(50) PRIMARY KEY REFERENCES public.prontuario_equipamentos(id_equipamento),
    horimetro_acumulado_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    horimetro_ultima_revisao NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    horas_desde_ultima_revisao NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    proxima_revisao_horas NUMERIC(12,2) NOT NULL DEFAULT 250.00,
    status_manutencao VARCHAR(50) DEFAULT 'Liberado para Operação',
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.relogio_manutencao (id_equipamento, horimetro_acumulado_total, horimetro_ultima_revisao, horas_desde_ultima_revisao, proxima_revisao_horas)
VALUES
    ('UT-34', 14820.4, 14700.0, 120.4, 250.0),
    ('UC-11', 18441.7, 18250.0, 191.7, 250.0),
    ('UC-15', 15112.6, 15000.0, 112.6, 250.0),
    ('UP-34', 6720.5, 6500.0, 220.5, 250.0),
    ('MN-01', 19822.1, 19790.0, 32.1, 40.0), -- Alerta preventivo (a < 10h da revisão de 40h)
    ('UB-02', 32180.9, 32000.0, 180.9, 500.0),
    ('TR-USINA-04', 10510.3, 10300.0, 210.3, 250.0),
    ('PIPA-01', 7890.4, 7700.0, 190.4, 250.0)
ON CONFLICT (id_equipamento) DO NOTHING;

-- 5. TABELA: paradas_equipamentos (Catálogo de motivos homologados)
CREATE TABLE IF NOT EXISTS public.paradas_equipamentos (
    id SERIAL PRIMARY KEY,
    id_equipamento VARCHAR(50) NULL,
    motivo_codigo VARCHAR(50) NOT NULL,
    motivo_descricao VARCHAR(200) NOT NULL,
    categoria_parada VARCHAR(50) NOT NULL -- 'Mecânica', 'Operacional', 'Clima'
);

INSERT INTO public.paradas_equipamentos (id_equipamento, motivo_codigo, motivo_descricao, categoria_parada)
VALUES
    (NULL, 'MEC-01', 'Quebra Mecânica / Manutenção Corretiva', 'Mecânica'),
    (NULL, 'ELE-01', 'Pane Elétrica ou Eletrônica', 'Mecânica'),
    (NULL, 'ABAS-01', 'Abastecimento de Combustível / Comboio', 'Operacional'),
    (NULL, 'ALM-01', 'Horário de Refeição e Almoço do Turno', 'Operacional'),
    (NULL, 'CLI-01', 'Chuva Intensa / Pista Escorregadia', 'Clima'),
    (NULL, 'PLT-01', 'Aguardando Liberação da Britagem / Pátio', 'Operacional'),
    ('UP-34', 'PERF-01', 'Troca de Punho ou Bits de Perfuração', 'Operacional'),
    ('UC-11', 'ROM-01', 'Manutenção no Rompedor Hidráulico', 'Mecânica')
ON CONFLICT DO NOTHING;

-- 6. TABELA FATO: producao_perfuracao_horaria (Apontamentos de Turno)
CREATE TABLE IF NOT EXISTS public.producao_perfuracao_horaria (
    id_apontamento UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_hora_apontamento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    turno VARCHAR(50) NOT NULL,
    id_equipamento VARCHAR(50) NOT NULL REFERENCES public.prontuario_equipamentos(id_equipamento),
    matricula_operador VARCHAR(50) NOT NULL,
    nome_operador VARCHAR(150),
    
    -- Horímetros e Validação (Constraint inviolável)
    horimetro_inicial NUMERIC(12,2) NOT NULL,
    horimetro_final NUMERIC(12,2) NOT NULL,
    horas_trabalhadas NUMERIC(12,2) GENERATED ALWAYS AS (horimetro_final - horimetro_inicial) STORED,
    
    -- Produção e Consumos
    producao_valor NUMERIC(12,2) DEFAULT 0.00,
    diesel_abastecido_litros NUMERIC(10,2) DEFAULT 0.00,
    horimetro_martelo NUMERIC(12,2) DEFAULT 0.00,
    
    -- Checklist em formato JSONB
    checklist_respostas JSONB DEFAULT '{}'::jsonb,
    
    -- Paradas Operacionais
    motivo_parada_codigo VARCHAR(50),
    duracao_parada_minutos INTEGER DEFAULT 0,
    horimetro_parada_ini NUMERIC(12,2),
    horimetro_parada_fim NUMERIC(12,2),
    observacao_parada TEXT,

    CONSTRAINT chk_horimetro CHECK (horimetro_final >= horimetro_inicial)
);

-- 7. TABELA: entrada_saida_estoque & saldo_materiais
CREATE TABLE IF NOT EXISTS public.entrada_saida_estoque (
    id_movimento UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_hora TIMESTAMPTZ DEFAULT NOW(),
    id_equipamento VARCHAR(50) REFERENCES public.prontuario_equipamentos(id_equipamento),
    tipo_material VARCHAR(50) NOT NULL, -- 'Brita 0', 'Brita 1', 'Areia', 'Bica Corrida'
    origem VARCHAR(100) NOT NULL,
    destino VARCHAR(100) NOT NULL,
    quantidade_viagens INTEGER DEFAULT 1,
    toneladas_estimadas NUMERIC(10,2) DEFAULT 18.00
);

-- 8. TRIGGER: Atualização automática de relógio de manutenção
CREATE OR REPLACE FUNCTION public.fn_trg_producao_relogio_manutencao()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.relogio_manutencao
    SET 
        horimetro_acumulado_total = NEW.horimetro_final,
        horas_desde_ultima_revisao = horas_desde_ultima_revisao + (NEW.horimetro_final - NEW.horimetro_inicial),
        atualizado_em = NOW()
    WHERE id_equipamento = NEW.id_equipamento;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_producao_relogio_manutencao ON public.producao_perfuracao_horaria;
CREATE TRIGGER trg_producao_relogio_manutencao
AFTER INSERT ON public.producao_perfuracao_horaria
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_producao_relogio_manutencao();

-- 9. VIEW: vw_colisao_manutencao_preditiva
CREATE OR REPLACE VIEW public.vw_colisao_manutencao_preditiva AS
SELECT 
    r.id_equipamento,
    p.nome_equipamento,
    r.horimetro_acumulado_total,
    r.horas_desde_ultima_revisao,
    r.proxima_revisao_horas,
    (r.proxima_revisao_horas - r.horas_desde_ultima_revisao) AS horas_restantes_revisao,
    CASE 
        WHEN (r.proxima_revisao_horas - r.horas_desde_ultima_revisao) <= 10 THEN 'ALERTA_PREVENTIVA_IMINENTE'
        WHEN (r.proxima_revisao_horas - r.horas_desde_ultima_revisao) <= 0 THEN 'REVISAO_VENCIDA'
        ELSE 'OPERACAO_NORMAL'
    END AS status_preditivo
FROM public.relogio_manutencao r
JOIN public.prontuario_equipamentos p ON r.id_equipamento = p.id_equipamento;

-- 10. RPC: Alerta Preditivo de Manutenção (< 10h da próxima revisão)
CREATE OR REPLACE FUNCTION public.alerta_manutencao_preditiva(p_id_equipamento VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_registro RECORD;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_registro 
    FROM public.vw_colisao_manutencao_preditiva 
    WHERE id_equipamento = p_id_equipamento;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'status', 'NAO_ENCONTRADO',
            'alerta', FALSE,
            'mensagem', 'Equipamento não localizado no sistema.'
        );
    END IF;

    IF v_registro.horas_restantes_revisao <= 10 THEN
        v_resultado := jsonb_build_object(
            'status', 'ALERTA',
            'alerta', TRUE,
            'equipamento', v_registro.id_equipamento,
            'nome', v_registro.nome_equipamento,
            'horas_restantes', v_registro.horas_restantes_revisao,
            'proxima_revisao', v_registro.proxima_revisao_horas,
            'mensagem', format('Atenção: Máquina a %s horas da revisão preventiva de %sh. Notifique a oficina.', 
                               v_registro.horas_restantes_revisao, v_registro.proxima_revisao_horas)
        );
    ELSE
        v_resultado := jsonb_build_object(
            'status', 'OK',
            'alerta', FALSE,
            'equipamento', v_registro.id_equipamento,
            'horas_restantes', v_registro.horas_restantes_revisao,
            'mensagem', 'Equipamento com plano de manutenção em dia.'
        );
    END IF;

    RETURN v_resultado;
END;
$$ LANGUAGE plpgsql;

-- 11. RPC: Fechamento de Turno & Disponibilidade Física
CREATE OR REPLACE FUNCTION public.fechamento_turno(
    p_data_turno DATE,
    p_turno VARCHAR,
    p_equipamento VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    v_total_horas NUMERIC := 0.00;
    v_total_producao NUMERIC := 0.00;
    v_total_diesel NUMERIC := 0.00;
    v_minutos_parada_mecanica INTEGER := 0;
    v_minutos_parada_total INTEGER := 0;
    v_horas_turno NUMERIC := 8.80; -- 8h48min padrão
    v_disponibilidade_fisica NUMERIC := 100.00;
BEGIN
    SELECT 
        COALESCE(SUM(horas_trabalhadas), 0),
        COALESCE(SUM(producao_valor), 0),
        COALESCE(SUM(diesel_abastecido_litros), 0),
        COALESCE(SUM(CASE WHEN pe.categoria_parada = 'Mecânica' THEN duracao_parada_minutos ELSE 0 END), 0),
        COALESCE(SUM(duracao_parada_minutos), 0)
    INTO 
        v_total_horas,
        v_total_producao,
        v_total_diesel,
        v_minutos_parada_mecanica,
        v_minutos_parada_total
    FROM public.producao_perfuracao_horaria pph
    LEFT JOIN public.paradas_equipamentos pe ON pph.motivo_parada_codigo = pe.motivo_codigo
    WHERE DATE(pph.data_hora_apontamento) = p_data_turno
      AND pph.turno = p_turno
      AND pph.id_equipamento = p_equipamento;

    -- Cálculo de Disponibilidade Física DF (%) = ((Horas Turno - Horas Parada Mecânica) / Horas Turno) * 100
    IF v_horas_turno > 0 THEN
        v_disponibilidade_fisica := ROUND((((v_horas_turno * 60) - v_minutos_parada_mecanica) / (v_horas_turno * 60)) * 100, 2);
        IF v_disponibilidade_fisica < 0 THEN v_disponibilidade_fisica := 0.00; END IF;
    END IF;

    RETURN jsonb_build_object(
        'data_turno', p_data_turno,
        'turno', p_turno,
        'equipamento', p_equipamento,
        'total_horas_trabalhadas', v_total_horas,
        'total_producao', v_total_producao,
        'total_diesel_litros', v_total_diesel,
        'parada_mecanica_minutos', v_minutos_parada_mecanica,
        'parada_total_minutos', v_minutos_parada_total,
        'disponibilidade_fisica_percentual', v_disponibilidade_fisica,
        'fechamento_concluido', TRUE
    );
END;
$$ LANGUAGE plpgsql;
