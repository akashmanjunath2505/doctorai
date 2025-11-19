import { ClinicalProtocol } from './types';

export const CLINICAL_PROTOCOLS: ClinicalProtocol[] = [
  {
    id: 'FOGSI-PPH-001',
    title: 'Management of Postpartum Hemorrhage (PPH)',
    metadata: {
      version: '1.2.0',
      date_effective: '2023-10-01',
      last_reviewed: '2024-07-15',
      authors: ['FOGSI Safe Motherhood Committee'],
      institution: 'Federation of Obstetric and Gynaecological Societies of India (FOGSI)',
      jurisdiction: ['India'],
      scope: 'Management of primary postpartum hemorrhage (blood loss ≥500 mL) within 24 hours of delivery.',
      'use_if_conditions': ['Patient is within 24 hours postpartum', 'Observed or suspected blood loss ≥500 mL'],
      canonical_sources: [
        { name: 'FOGSI GCPR', url: 'https://www.fogsi.org/gcpr-listing/' },
        { name: 'WHO recommendations for PPH', url: 'https://www.who.int/publications/i/item/9789240062132' },
        { name: 'ACOG Practice Bulletin No. 183' },
        { name: 'RCOG Green-top Guideline No. 52' },
      ],
      reviewer_signoff: [{ name: 'Dr. A. Sharma', date: '2024-07-10', comments: 'Approved version 1.2' }],
      related_protocols: ['MTP-OB-001'],
    },
    preconditions: ['Confirmation of delivery of fetus.'],
    settings: ['Primary', 'Secondary', 'Tertiary'],
    stepwise_actions: [
      { id: 'pph-step1', timing: 'Minute 0-5 (Immediate)', title: 'Initial Response & Resuscitation', is_critical: true, actions: [
        'Call for Help (Code Red/Code PPH). Alert obstetric, anesthesia, and nursing staff.',
        'Simultaneously Assess A-B-C (Airway, Breathing, Circulation) and begin resuscitation.',
        'Establish TWO large-bore IV cannulas (16-18 gauge).',
        'Send blood for type & cross-match, FBC, coagulation profile, fibrinogen.',
        'Begin rapid infusion of warm crystalloids (e.g., Normal Saline, Ringer\'s Lactate) up to 2L.',
        'Administer high-flow oxygen (10-15 L/min) via face mask.',
        'Ensure continuous monitoring of vital signs (BP, HR, RR, SpO2). Insert Foley catheter to monitor urine output.'
      ]},
      { id: 'pph-step2', timing: 'Minute 0-15', title: 'Identify and Manage Cause (The 4 T\'s)', is_critical: true, actions: [
        'Check TONE: Rub up a contraction. Massage the uterine fundus firmly. This is the most common cause (70%).',
        'Administer First-Line Uterotonics (IV Oxytocin infusion as per Dosing Table). If Oxytocin is unavailable, the primary alternative is Misoprostol 800-1000 mcg per rectum.',
        'Check TISSUE: Ensure placenta is complete. If any doubt, perform manual exploration of the uterus for retained products.',
        'Check TRAUMA: Inspect for lacerations of the cervix, vagina, and perineum. Repair any identified trauma.',
        'Check THROMBIN: Review coagulation status. Consider coagulopathy if bleeding persists despite a well-contracted uterus.'
      ]},
      { id: 'pph-step3', timing: 'Minute 15-30', title: 'Second-Line Measures & Tamponade', is_critical: false, actions: [
        'If bleeding continues despite uterotonics, initiate uterine tamponade.',
        '**Procedure for Uterine Tamponade (e.g., Bakri Balloon):**',
        '1. Aseptically prepare the area.',
        '2. Insert the balloon catheter into the uterus under ultrasound guidance if possible.',
        '3. Inflate with 300-500 mL of sterile saline until bleeding stops or the maximum volume is reached.',
        '4. Secure the catheter to the patient\'s thigh with slight tension.',
        '5. Connect the drainage port to a collection bag to monitor ongoing blood loss.',
      ],
      troubleshooting: ['If bleeding continues after 15-20 mins of tamponade, confirm placement and inflation. If still bleeding, escalate to surgical management without delay.']
      },
    ],
    dosing_table: [
      { drug_name: 'Oxytocin', brand_names_india: ['Syntocinon', 'Pitocin'], available_strengths: ['5 IU/mL', '10 IU/mL'], formula: '10-20 IU in 500mL NS/RL', route: 'IV Infusion', dilution_instructions: 'Add 10 IU (1-2mL) to a 500mL bag of Normal Saline or Ringer\'s Lactate.', administration_details: 'Run at 250 mL/hr. Initial bolus of 5-10 IU IV slow push over 1-2 mins is common but carries risk of hypotension.', max_dose: '40 IU in first 2 hours.', monitoring: ['BP', 'Heart Rate'], contraindications: ['Caution in hypotensive patients.'] },
      { drug_name: 'Methylergometrine (Methergine)', brand_names_india: ['Methergin', 'Ergon'], available_strengths: ['0.2 mg/mL'], formula: '0.2 mg', route: 'IM or slow IV', dilution_instructions: 'For IV, dilute 0.2mg in 5mL saline and give over 1 minute.', administration_details: 'May be repeated every 2-4 hours.', max_dose: '5 doses (1.0 mg)', monitoring: ['Blood Pressure'], contraindications: ['Hypertension', 'Pre-eclampsia', 'Cardiac disease.'] },
      { drug_name: 'Carboprost (Hemabate)', brand_names_india: ['Prostodin', 'Caboprost'], available_strengths: ['125 mcg/mL', '250 mcg/mL'], formula: '0.25 mg (250 mcg)', route: 'IM', dilution_instructions: 'No dilution needed for IM use.', administration_details: 'May be repeated every 15 minutes.', max_dose: '8 doses (2 mg)', monitoring: ['Respiratory status, Temperature'], contraindications: ['Asthma', 'Active pulmonary, renal, or hepatic disease.'] },
      { drug_name: 'Misoprostol', brand_names_india: ['Cytolog', 'Misoprost'], available_strengths: ['100 mcg', '200 mcg tablets'], formula: '800-1000 mcg', route: 'Per Rectum (PR)', dilution_instructions: 'No dilution needed.', administration_details: 'Single dose. Effective for absorption even if patient is hypotensive.', max_dose: '1000 mcg', monitoring: ['Temperature'], contraindications: ['Prostaglandin allergy.'] },
      { drug_name: 'Tranexamic Acid (TXA)', brand_names_india: ['Tranexa', 'Pause'], available_strengths: ['500 mg/5mL'], formula: '1 g (10 mL)', route: 'IV', dilution_instructions: 'Administer neat or in a small volume of saline.', administration_details: 'Administer slowly over 10 minutes. Must be given within 3 hours of birth.', max_dose: 'Second dose of 1g if bleeding continues after 30 mins.', monitoring: [], contraindications: ['Active thromboembolic disease.'] }
    ],
    monitoring_template: {
      title: 'Post-PPH Nursing Monitoring',
      parameters: [
          { parameter: 'BP & Heart Rate', frequency: 'Every 15 mins for 2 hours, then every 30 mins for 2 hours, then hourly.'},
          { parameter: 'Uterine Tone', frequency: 'Every 15 mins for 2 hours.'},
          { parameter: 'Vaginal Bleeding (Pad Count)', frequency: 'Every 15-30 mins.'},
          { parameter: 'Urine Output', frequency: 'Hourly.'},
      ],
      alert_triggers: [
          { condition: 'Systolic BP < 90 mmHg or > 160 mmHg', action: 'Alert clinician immediately.'},
          { condition: 'Heart Rate > 120 bpm', action: 'Alert clinician immediately.'},
          { condition: 'Urine Output < 30 mL/hr for 2 consecutive hours', action: 'Alert clinician.'},
          { condition: 'Uterus becomes boggy', action: 'Restart uterine massage and alert clinician.'},
      ]
    },
    contraindications_general: ['Always check patient allergies before administering any medication.'],
    escalation_triggers: [
      { condition: 'Blood loss exceeds 1500 mL or patient is hemodynamically unstable despite initial measures.', action: 'Activate Massive Transfusion Protocol (see MTP-OB-001). Prepare for surgical intervention.', requires_confirmation: true },
      { condition: 'Bleeding continues after first-line and second-line measures fail (refractory PPH).', action: 'Move patient to Operating Theater for examination under anesthesia and potential surgical intervention (e.g., B-Lynch, artery ligation, hysterectomy).', requires_confirmation: true }
    ],
    references: [{ citation: 'FOGSI-ICOG GCPR on PPH, 2022.' }]
  },
  {
    id: 'FOGSI-ECL-001',
    title: 'Management of Severe Pre-eclampsia and Eclampsia',
    metadata: {
      version: '1.1.0',
      date_effective: '2023-01-01',
      last_reviewed: '2024-07-15',
      authors: ['FOGSI Hypertension in Pregnancy Committee'],
      institution: 'Federation of Obstetric and Gynaecological Societies of India (FOGSI)',
      jurisdiction: ['India'],
      scope: 'Management of severe pre-eclampsia and eclampsia in pregnant women.',
      'use_if_conditions': ['Pregnant patient >20 weeks gestation', 'BP ≥ 160/110 mmHg', 'Patient is having or has had a seizure.'],
      canonical_sources: [ { name: 'FOGSI GCPR' }, { name: 'WHO recommendations' }, { name: 'ACOG Practice Bulletin No. 222' } ],
      reviewer_signoff: [{ name: 'Dr. R. Gupta', date: '2024-07-12', comments: 'Approved version 1.1' }],
    },
    preconditions: ['Pregnancy >20 weeks gestation.'],
    settings: ['Secondary', 'Tertiary'],
    stepwise_actions: [
      { id: 'ecl-step1', timing: 'Immediate', title: 'Seizure Management (Eclampsia)', is_critical: true, actions: [
        'Call for Help. Do not leave the patient alone.',
        'Position patient in left lateral position to reduce aspiration risk.',
        'Ensure Airway is patent. Provide oxygen (10-15 L/min).',
        'Administer Magnesium Sulphate (MgSO4) to control the seizure (see Dosing Table). This is the priority.',
        'Protect patient from injury. Do not use tongue blades or restrain forcefully.'
      ]},
      { id: 'ecl-step2', timing: 'Concurrent', title: 'Control Severe Hypertension', is_critical: true, actions: [
        'Goal: Lower BP to a target of 140-150 / 90-100 mmHg to prevent stroke.',
        'Administer IV antihypertensives (see Dosing Table for Labetalol or Hydralazine).',
        'Monitor BP every 5-10 minutes during acute phase.'
      ]},
      { id: 'ecl-step3', timing: 'After Stabilization', title: 'Monitoring & Delivery Plan', is_critical: false, actions: [
        'Monitor for signs of Magnesium toxicity (see Monitoring Template).',
        'Keep the antidote, Calcium Gluconate, at the bedside.',
        'The definitive treatment for eclampsia and severe pre-eclampsia is DELIVERY. Plan for delivery once the mother is stabilized.'
      ]}
    ],
    dosing_table: [
      { drug_name: 'Magnesium Sulphate (MgSO4)', brand_names_india: ['Magna-Sip', 'Mag-Sulf'], available_strengths: ['50% solution (500mg/mL)'], formula: '4g Loading Dose + 1-2g/hr Maintenance', route: 'IV', dilution_instructions: 'Loading: Dilute 8mL of 50% MgSO4 in 12mL NS (total 20mL) or add to 100mL NS bag. Maintenance: Add 20mL of 50% MgSO4 to 500mL NS for a 2g/100mL solution.', administration_details: 'Loading dose over 15-20 minutes. Maintenance dose via infusion pump.', max_dose: 'Continue for 24 hours postpartum.', monitoring: ['See Monitoring Template'], reversal_agent: 'Calcium Gluconate 1g (10ml of 10% solution) IV over 10 minutes.' },
      { drug_name: 'Labetalol', brand_names_india: ['Labebet', 'Normadate'], available_strengths: ['5 mg/mL'], formula: '20mg IV bolus, then escalate', route: 'IV', dilution_instructions: 'No dilution needed for bolus.', administration_details: 'Start with 20mg (4mL) IV over 2 mins. If no response in 10 mins, give 40mg. If no response, give 80mg.', max_dose: '300mg total cumulative dose.', monitoring: ['BP', 'Heart Rate'], contraindications: ['Asthma', 'Heart failure', 'Bradycardia.'] },
      { drug_name: 'Hydralazine', brand_names_india: ['Apresoline'], available_strengths: ['20 mg/mL'], formula: '5mg IV bolus', route: 'IV', dilution_instructions: 'Dilute 1mL (20mg) in 19mL NS to get 1mg/mL solution.', administration_details: 'Administer 5mg (5mL of diluted solution) IV slowly. Can repeat every 20-30 minutes.', max_dose: '20mg total.', monitoring: ['BP', 'Heart Rate'], contraindications: ['Caution in tachycardia.'] }
    ],
    monitoring_template: {
        title: 'Magnesium Sulphate Toxicity Watch',
        parameters: [
            { parameter: 'Respiratory Rate', frequency: 'Hourly', normal_range: '> 12 breaths/min' },
            { parameter: 'Patellar Reflexes', frequency: 'Hourly', normal_range: 'Present' },
            { parameter: 'Urine Output', frequency: 'Hourly', normal_range: '> 30 mL/hr' },
            { parameter: 'Level of Consciousness', frequency: 'Hourly' }
        ],
        alert_triggers: [
            { condition: 'Any sign of toxicity (RR < 12, reflexes absent, urine < 30mL/hr)', action: 'STOP Magnesium infusion immediately. Administer Calcium Gluconate. Alert senior clinician.' }
        ]
    },
    contraindications_general: ['Avoid diuretics unless pulmonary edema is present. Avoid rapid, excessive lowering of BP which can compromise uteroplacental perfusion.'],
    escalation_triggers: [
      { condition: 'Recurrent seizure despite adequate MgSO4 therapy.', action: 'Administer an additional 2g MgSO4 bolus. Consider second-line anticonvulsants (e.g., Diazepam) with anesthesia support. Expedite delivery.', requires_confirmation: true },
      { condition: 'Persistent severe hypertension despite maximum doses of two different antihypertensive agents.', action: 'Consult with anesthesia/critical care. Consider an arterial line for monitoring. Expedite delivery.', requires_confirmation: true }
    ],
    references: [{ citation: 'FOGSI-ICOG GCPR on Hypertensive Disorders in Pregnancy, 2021.' }]
  },
  {
    id: 'MTP-OB-001',
    title: 'Massive Transfusion Protocol (MTP) - Obstetrics',
    metadata: {
      version: '1.0.0',
      date_effective: '2024-01-01',
      last_reviewed: '2024-07-15',
      authors: ['Hospital Transfusion Committee'],
      institution: 'Aivana General Hospital (Template)',
      jurisdiction: ['India'],
      scope: 'Management of massive obstetric hemorrhage requiring large volume blood product replacement.',
      'use_if_conditions': ['Estimated Blood Loss > 1500 mL and ongoing', 'Hemodynamic instability (e.g., SBP < 90, HR > 120) unresponsive to initial fluids', 'Clinician judgment of need for massive transfusion.'],
      canonical_sources: [ { name: 'Indian Society of Transfusion Medicine Guidelines' } ],
      reviewer_signoff: [{ name: 'Dr. B. Singh', date: '2024-07-14', comments: 'Initial protocol approved' }],
    },
    preconditions: ['Active, severe hemorrhage.'],
    settings: ['Secondary', 'Tertiary'],
    stepwise_actions: [
      { id: 'mtp-step1', timing: 'Immediate', title: 'Activation', is_critical: true, actions: [
        'Declare "MASSIVE TRANSFUSION - OBSTETRICS" to the blood bank and the clinical team.',
        'State patient name, ID, and location.',
        'Designate one person for communication with the blood bank.'
      ]},
      { id: 'mtp-step2', timing: 'Concurrent', title: 'Initial Product Release ("MTP Pack A")', is_critical: true, actions: [
        'Blood bank will immediately release the first pack:',
        '- 4 units of O-negative (or type-specific) Packed Red Blood Cells (PRBCs)',
        '- 4 units of Fresh Frozen Plasma (FFP)',
        '- 1 unit of Platelets (pooled or apheresis)',
        'Send runner to blood bank to collect the pack.',
        'Begin transfusion in a 1:1:1 ratio (PRBC:FFP:Platelets).'
      ]},
      { id: 'mtp-step3', timing: 'Ongoing', title: 'Continued Resuscitation & Monitoring', is_critical: false, actions: [
        'Send STAT labs with every MTP pack request: FBC, Coagulation Profile (PT/APTT/INR), Fibrinogen, Arterial Blood Gas (ABG) for lactate, pH, electrolytes.',
        'Target resuscitation endpoints: SBP 90-100 mmHg, Fibrinogen > 1.5-2.0 g/L, Platelets > 50,000/μL, normal pH and lactate.',
        'Administer Tranexamic Acid 1g IV if not already given.',
        'Consider Cryoprecipitate (10 units) if Fibrinogen is < 1.5 g/L.',
        'Use a fluid warmer for all blood products and IV fluids.'
      ]}
    ],
    dosing_table: [], // Dosing is part of the pack contents
    monitoring_template: {
        title: 'MTP Monitoring',
        parameters: [
            { parameter: 'Vitals (BP, HR, Temp, SpO2)', frequency: 'Every 5-15 minutes continuously.' },
            { parameter: 'Labs (FBC, Coags, Fibrinogen)', frequency: 'With each MTP pack or every 30-60 minutes.' },
            { parameter: 'ABG (pH, Lactate, Calcium)', frequency: 'Every 30-60 minutes.' }
        ],
        alert_triggers: [
            { condition: 'Temperature < 35°C (Hypothermia)', action: 'Apply active warming measures (e.g., Bair Hugger).' },
            { condition: 'Ionized Calcium < 1.1 mmol/L (Hypocalcemia)', action: 'Administer Calcium Gluconate 1g IV.' },
            { condition: 'pH < 7.2 (Acidosis)', action: 'Correct underlying cause (hypovolemia), consider bicarbonate with critical care input.' }
        ]
    },
    contraindications_general: [],
    escalation_triggers: [
      { condition: 'Resuscitation targets are not met after 2-3 MTP packs.', action: 'Re-evaluate surgical control of bleeding. Consult hematology.', requires_confirmation: true },
      { condition: 'Patient is stabilized and bleeding is controlled.', action: 'De-activate MTP. Communicate clearly with blood bank. Continue to monitor closely.', requires_confirmation: true }
    ],
    references: [{ citation: 'Guidelines for developing a massive transfusion protocol, ISBT Science Series, 2015.' }]
  },
  {
    id: 'FOGSI-UI-001',
    title: 'Management of Uterine Inversion',
    metadata: {
      version: '1.0.0',
      date_effective: '2023-05-01',
      last_reviewed: '2024-07-15',
      authors: ['FOGSI Safe Motherhood Committee'],
      institution: 'Federation of Obstetric and Gynaecological Societies of India (FOGSI)',
      jurisdiction: ['India'],
      scope: 'Management of acute uterine inversion immediately postpartum.',
      'use_if_conditions': ['Uterine fundus is not palpable abdominally', 'A mass is visible at the introitus or in the vagina', 'Patient has sudden onset of pain and hemorrhage, often with neurogenic shock.'],
      canonical_sources: [ { name: 'FOGSI GCPR' }, { name: 'ACOG' } ],
      reviewer_signoff: [{ name: 'Dr. A. Sharma', date: '2024-07-10', comments: 'Initial protocol approved' }],
    },
    preconditions: ['Patient is immediately postpartum.'],
    settings: ['Primary', 'Secondary', 'Tertiary'],
    stepwise_actions: [
      { id: 'ui-step1', timing: 'Immediate', title: 'Initial Response', is_critical: true, actions: [
        'Call for Help (Obstetrician, Anesthesiologist, Nursing staff). This is an obstetric emergency.',
        'Do NOT remove the placenta if it is still attached.',
        'Begin resuscitation for hemorrhage and shock as per PPH protocol (2 large bore IVs, fluids, send labs).',
      ]},
      { id: 'ui-step2', timing: 'Immediate', title: 'Manual Replacement (Johnson\'s Maneuver)', is_critical: true, actions: [
        'Attempt immediate manual replacement of the uterus.',
        'Place the palm of the hand on the fundus with fingers extended and push the uterus back up through the cervix into its normal position.',
        'Hold the uterus in place with your fist internally and perform fundal massage with the other hand externally.',
        'Administer Uterotonics (Oxytocin infusion) ONLY AFTER the uterus is replaced.'
      ]},
      { id: 'ui-step3', timing: 'If Manual Fails', title: 'Pharmacological Relaxation & Surgical Options', is_critical: false, actions: [
        'If manual replacement fails, administer a uterine relaxant (tocolytic) e.g., Terbutaline 0.25mg SC/IV or Nitroglycerin IV.',
        'Re-attempt manual replacement once uterus is relaxed.',
        'If this fails, transfer to Operating Theater for surgical correction (e.g., Huntington or Haultain procedure).',
      ]}
    ],
    dosing_table: [], // Uterotonic dosing is in PPH protocol
    monitoring_template: {
        title: 'Post-Replacement Monitoring',
        parameters: [
            { parameter: 'Vitals', frequency: 'As per PPH protocol.' },
            { parameter: 'Uterine firmness', frequency: 'Continuously for first hour.' }
        ],
        alert_triggers: [
            { condition: 'Uterus re-inverts or becomes boggy.', action: 'Alert clinician immediately, may need ongoing internal pressure or surgical intervention.' }
        ]
    },
    contraindications_general: ['Do NOT give uterotonics BEFORE replacing the uterus as this can trap the uterus in the inverted position.'],
    escalation_triggers: [
      { condition: 'Manual replacement is unsuccessful after two attempts or with tocolysis.', action: 'Escalate to surgical management in the Operating Theater without delay.', requires_confirmation: true }
    ],
    references: [{ citation: 'FOGSI GCPR on Complicated Third Stage of Labour.' }]
  }
];