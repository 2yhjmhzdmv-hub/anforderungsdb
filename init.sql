CREATE EXTENSION IF NOT EXISTS vector;

-- Themenbereiche
CREATE TABLE category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geltungsbereiche (selbstreferenzierend, kaskadierend)
CREATE TABLE scope (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('organisation', 'produkt', 'infrastruktur')),
    parent_scope_id INTEGER REFERENCES scope(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_root_organisation CHECK (
        type != 'organisation' OR parent_scope_id IS NULL
    )
);

-- ISO 27001 Annex A Controls (93er-Katalog)
CREATE TABLE iso_control (
    id SERIAL PRIMARY KEY,
    control_id VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    domain VARCHAR(100)
);

-- Stammanforderungen
CREATE TABLE requirement (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    category_id INTEGER REFERENCES category(id) ON DELETE SET NULL,
    embedding vector(1024),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX requirement_embedding_idx ON requirement
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- n:m Crosswalk: Stammanforderung <-> ISO-Control
CREATE TABLE requirement_iso_control (
    requirement_id INTEGER NOT NULL REFERENCES requirement(id) ON DELETE CASCADE,
    iso_control_id INTEGER NOT NULL REFERENCES iso_control(id) ON DELETE CASCADE,
    PRIMARY KEY (requirement_id, iso_control_id)
);

-- Antworten (pro Kombination requirement + scope genau eine)
CREATE TABLE answer (
    id SERIAL PRIMARY KEY,
    requirement_id INTEGER NOT NULL REFERENCES requirement(id) ON DELETE CASCADE,
    scope_id INTEGER NOT NULL REFERENCES scope(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (requirement_id, scope_id)
);

-- Kundenanforderungen
CREATE TABLE customer_requirement (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    scope_id INTEGER NOT NULL REFERENCES scope(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- n:m Mapping: Kundenanforderung <-> Stammanforderung
CREATE TABLE customer_requirement_mapping (
    customer_requirement_id INTEGER NOT NULL REFERENCES customer_requirement(id) ON DELETE CASCADE,
    requirement_id INTEGER NOT NULL REFERENCES requirement(id) ON DELETE CASCADE,
    score FLOAT,
    is_manual BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (customer_requirement_id, requirement_id)
);

-- Seed: ISO 27001:2022 Annex A Controls (93 Controls)
INSERT INTO iso_control (control_id, title, domain) VALUES
('A.5.1','Policies for information security','Organisational'),
('A.5.2','Information security roles and responsibilities','Organisational'),
('A.5.3','Segregation of duties','Organisational'),
('A.5.4','Management responsibilities','Organisational'),
('A.5.5','Contact with authorities','Organisational'),
('A.5.6','Contact with special interest groups','Organisational'),
('A.5.7','Threat intelligence','Organisational'),
('A.5.8','Information security in project management','Organisational'),
('A.5.9','Inventory of information and other associated assets','Organisational'),
('A.5.10','Acceptable use of information and other associated assets','Organisational'),
('A.5.11','Return of assets','Organisational'),
('A.5.12','Classification of information','Organisational'),
('A.5.13','Labelling of information','Organisational'),
('A.5.14','Information transfer','Organisational'),
('A.5.15','Access control','Organisational'),
('A.5.16','Identity management','Organisational'),
('A.5.17','Authentication information','Organisational'),
('A.5.18','Access rights','Organisational'),
('A.5.19','Information security in supplier relationships','Organisational'),
('A.5.20','Addressing information security within supplier agreements','Organisational'),
('A.5.21','Managing information security in the ICT supply chain','Organisational'),
('A.5.22','Monitoring, review and change management of supplier services','Organisational'),
('A.5.23','Information security for use of cloud services','Organisational'),
('A.5.24','Information security incident management planning and preparation','Organisational'),
('A.5.25','Assessment and decision on information security events','Organisational'),
('A.5.26','Response to information security incidents','Organisational'),
('A.5.27','Learning from information security incidents','Organisational'),
('A.5.28','Collection of evidence','Organisational'),
('A.5.29','Information security during disruption','Organisational'),
('A.5.30','ICT readiness for business continuity','Organisational'),
('A.5.31','Legal, statutory, regulatory and contractual requirements','Organisational'),
('A.5.32','Intellectual property rights','Organisational'),
('A.5.33','Protection of records','Organisational'),
('A.5.34','Privacy and protection of PII','Organisational'),
('A.5.35','Independent review of information security','Organisational'),
('A.5.36','Compliance with policies, rules and standards for information security','Organisational'),
('A.5.37','Documented operating procedures','Organisational'),
('A.6.1','Screening','People'),
('A.6.2','Terms and conditions of employment','People'),
('A.6.3','Information security awareness, education and training','People'),
('A.6.4','Disciplinary process','People'),
('A.6.5','Responsibilities after termination or change of employment','People'),
('A.6.6','Confidentiality or non-disclosure agreements','People'),
('A.6.7','Remote working','People'),
('A.6.8','Information security event reporting','People'),
('A.7.1','Physical security perimeters','Physical'),
('A.7.2','Physical entry','Physical'),
('A.7.3','Securing offices, rooms and facilities','Physical'),
('A.7.4','Physical security monitoring','Physical'),
('A.7.5','Protecting against physical and environmental threats','Physical'),
('A.7.6','Working in secure areas','Physical'),
('A.7.7','Clear desk and clear screen','Physical'),
('A.7.8','Equipment siting and protection','Physical'),
('A.7.9','Security of assets off-premises','Physical'),
('A.7.10','Storage media','Physical'),
('A.7.11','Supporting utilities','Physical'),
('A.7.12','Cabling security','Physical'),
('A.7.13','Equipment maintenance','Physical'),
('A.7.14','Secure disposal or re-use of equipment','Physical'),
('A.8.1','User endpoint devices','Technological'),
('A.8.2','Privileged access rights','Technological'),
('A.8.3','Information access restriction','Technological'),
('A.8.4','Access to source code','Technological'),
('A.8.5','Secure authentication','Technological'),
('A.8.6','Capacity management','Technological'),
('A.8.7','Protection against malware','Technological'),
('A.8.8','Management of technical vulnerabilities','Technological'),
('A.8.9','Configuration management','Technological'),
('A.8.10','Information deletion','Technological'),
('A.8.11','Data masking','Technological'),
('A.8.12','Data leakage prevention','Technological'),
('A.8.13','Information backup','Technological'),
('A.8.14','Redundancy of information processing facilities','Technological'),
('A.8.15','Logging','Technological'),
('A.8.16','Monitoring activities','Technological'),
('A.8.17','Clock synchronisation','Technological'),
('A.8.18','Use of privileged utility programs','Technological'),
('A.8.19','Installation of software on operational systems','Technological'),
('A.8.20','Networks security','Technological'),
('A.8.21','Security of network services','Technological'),
('A.8.22','Segregation of networks','Technological'),
('A.8.23','Web filtering','Technological'),
('A.8.24','Use of cryptography','Technological'),
('A.8.25','Secure development life cycle','Technological'),
('A.8.26','Application security requirements','Technological'),
('A.8.27','Secure system architecture and engineering principles','Technological'),
('A.8.28','Secure coding','Technological'),
('A.8.29','Security testing in development and acceptance','Technological'),
('A.8.30','Outsourced development','Technological'),
('A.8.31','Separation of development, test and production environments','Technological'),
('A.8.32','Change management','Technological'),
('A.8.33','Test information','Technological'),
('A.8.34','Protection of information systems during audit testing','Technological');
