
export const MTP_PROTOCOL_JSON = {
  "protocol": {
    "protocol_id": "mtp-obstetric-001",
    "title": "Massive Transfusion Protocol (Obstetric)",
    "version": "1.0.0",
    "date_effective": "2025-10-01",
    "last_reviewed": "2025-10-01",
    "authors": ["Dr. [Name] (Obstetrics)", "Dr. [Name] (Transfusion Medicine)"],
    "jurisdiction": "India - Local hospital adaptation",
    "description": "Activation and management guide for Massive Transfusion Protocol (MTP) in obstetric hemorrhage. Includes activation criteria, tiered pack contents, contact lists, lab monitoring cadence, escalation timeline, and provenance metadata.",
    "activation_criteria": [
      "Estimated blood loss (EBL) ≥ 1500 mL",
      "Ongoing bleeding with hemodynamic instability (SBP < 90 mmHg or MAP < 60 mmHg or HR > 120)",
      "Ongoing bleeding > 1000 mL despite first-line uterotonics and basic resuscitation",
      "Clinical judgment by senior clinician (OBG/Anesthetist) to activate MTP"
    ],
    "pack_contents": {
      "Pack A (Initial pack)": {
        "description": "Immediate release pack for MTP activation",
        "contents": [
          {"product":"PRBC","units":4},
          {"product":"FFP","units":4},
          {"product":"Platelets","units":1}
        ],
        "preferred_ratio":"1:1:0.25–0.5 (PRBC:FFP:Platelets) or local hospital pack composition"
      },
      "Subsequent_packs": {
        "pack_size":"Same as Pack A; repeat as clinical need",
        "note":"Adjust ratio based on labs (fibrinogen, platelets, coagulation profile) and TEG/ROTEM if available"
      }
    },
    "contact_list": {
      "blood_bank_name":"[Hospital Blood Bank]",
      "blood_bank_phone":"+91-xxxxxxxxxx",
      "on_call_transfusion_medicine":"[Dr. Name]",
      "on_call_anesthesia":"[Dr. Name]",
      "operating_theatre_contact":"+91-xxxxxxxxxx"
    },
    "sample_labeling_and_transport": {
      "minimum_samples":"2 x 5 mL EDTA for crossmatch, 2 x citrated plasma for coagulation and fibrinogen, blood cultures as indicated",
      "labeling":"Include patient name, MRN, time of draw, 'MTP ACTIVATION' flag, and contacts",
      "transport":"Designated runner to deliver samples to blood bank with courier details; expected turnaround time depends on site."
    },
    "lab_monitoring": [
      {"test":"Stat CBC","timing":"baseline and repeat every 30–60 min as clinically indicated"},
      {"test":"ABG with lactate","timing":"stat at activation and repeat every 30–60 min"},
      {"test":"Fibrinogen","timing":"stat; trend every 30–60 min until stable"},
      {"test":"PT/INR, aPTT","timing":"stat and repeat based on clinical course"},
      {"test":"Calcium, potassium, magnesium","timing":"baseline and repeat if transfusing large volumes or abnormal values"},
      {"test":"TEG/ROTEM (if available)","timing":"baseline and to guide component therapy"}
    ],
    "escalation_timeline": [
      {"timeframe":"0-5 minutes","actions":["Call for MTP activation (announce patient identifiers)","Prepare two large-bore IV/IO accesses or ensure existing access","Start high-flow oxygen and basic resuscitation"]},
      {"timeframe":"5-15 minutes","actions":["Dispatch Pack A from blood bank; deliver crossmatch samples","Start balanced transfusion; consider empirical PRBC:FFP:Platelet ratio per pack contents","Begin warming fluids and blood products"]},
      {"timeframe":"15-60 minutes","actions":["Continue component therapy per clinical response and labs","Consider tranexamic acid if within 3 hours from bleeding onset (1 g IV)","Reassess for surgical control; move to OT if uncontrolled bleeding"]},
      {"timeframe":">60 minutes","actions":["Escalate to senior surgery/anesthesia leadership for definitive control","Consider interventional radiology (embolization) if available","Consider ICU transfer post-resuscitation"]}
    ],
    "transfusion_guidance_and_notes": [
      "When available, target balanced transfusion with early FFP and platelets to prevent dilutional coagulopathy.",
      "Correct hypocalcemia during massive transfusion (give calcium gluconate 1 g IV slow as needed).",
      "Monitor for hypothermia and warm all fluids and blood products when possible."
    ],
    "provenance": [
      {"source":"Local adaptation - FOGSI/WHO/ACOG/RCOG guidelines (see local KB entries)","date":"2025-09-01","confidence":"high"}
    ],
    "smr_reviewers": [
      {"name":"[Reviewer 1]","role":"OBGYN SME","date_signed":""},
      {"name":"[Reviewer 2]","role":"Transfusion Medicine SME","date_signed":""}
    ],
    "notes":"Replace placeholder contacts and hospital-specific details with live information for deployment."
  },
  "test_cases": [
    {
      "id":"MTP-TC-001",
      "scenario":"Clear activation: massive PPH with hypotension",
      "input_text":"Ongoing PPH, EBL 1600 mL, BP 85/60, HR 125. Should we activate MTP?",
      "expected_output":{
        "actions":[
          "Activate MTP now and announce patient identifiers to blood bank",
          "Dispatch Pack A: PRBC x4, FFP x4, Platelet x1",
          "Send stat crossmatch and coagulation samples labeled 'MTP ACTIVATION'",
          "Begin balanced transfusion per Pack A and start warming products",
          "Start monitoring labs: CBC, ABG, fibrinogen; correct electrolytes and calcium as needed",
          "Prepare patient for immediate surgical intervention (OT) if bleeding not controlled"
        ],
        "acceptance_criteria":[
          "Response explicitly says 'Activate MTP'",
          "Includes request for PRBC and FFP and mentions ratio/pack composition",
          "Includes sending stat labs and labeling 'MTP ACTIVATION'"
        ],
        "protocol_id":"mtp-obstetric-001"
      }
    },
    {
      "id":"MTP-TC-002",
      "scenario":"Borderline EBL without instability",
      "input_text":"PPH with cumulative EBL 1200 mL but patient hemodynamically stable (BP 110/70, HR 90). Should we activate MTP?",
      "expected_output":{
        "actions":[
          "Do not automatically activate full MTP; continue resuscitation measures (fundal massage, uterotonics, IV fluids)",
          "Prepare crossmatch samples and alert blood bank of possible escalation",
          "Reassess frequently; activate MTP if bleeding continues or hemodynamic instability develops"
        ],
        "acceptance_criteria":[
          "Response recommends continued medical management and heightened monitoring",
          "Response indicates preparations (crossmatch) rather than immediate MTP activation"
        ],
        "protocol_id":"mtp-obstetric-001"
      }
    },
    {
      "id":"MTP-TC-003",
      "scenario":"MTP already activated and pack delivered",
      "input_text":"MTP activated 10 minutes ago; Pack A delivered and two units PRBC transfused but bleeding continues. Next steps?",
      "expected_output":{
        "actions":[
          "Continue component therapy: request additional packs (repeat Pack A as needed)",
          "Check lab trends (fibrinogen, PT/INR, platelets, ABG) to guide additional FFP/platelets or cryoprecipitate",
          "Consider pro-hemostatic agents per local protocol (e.g., cryoprecipitate if fibrinogen low)",
          "Escalate to OT for definitive surgical control and call senior surgical leadership"
        ],
        "acceptance_criteria":[
          "Response includes repeating packs and using labs to guide further component therapy",
          "Mentions escalation to surgical control/OT"
        ],
        "protocol_id":"mtp-obstetric-001"
      }
    },
    {
      "id":"MTP-TC-004",
      "scenario":"Edge case - TXA timing",
      "input_text":"Massive PPH with ongoing bleeding; initial bleeding started 4.5 hours ago. Should TXA be given?",
      "expected_output":{
        "actions":[
          "Note that TXA demonstrates greatest benefit when given within 3 hours of bleeding onset; beyond 3 hours routine benefit is reduced",
          "Prioritize transfusion, surgical control, and component therapy; consider TXA only after senior clinician assessment and local policy",
          "Document rationale if TXA used beyond recommended window"
        ],
        "acceptance_criteria":[
          "Response states 3-hour effectiveness window and recommends clinician judgment for use beyond that window"
        ],
        "protocol_id":"mtp-obstetric-001"
      }
    },
    {
      "id":"MTP-TC-005",
      "scenario":"Blood bank delay",
      "input_text":"MTP activated but blood bank reports a 15-minute delay in dispatch due to courier constraints. What to do?",
      "expected_output":{
        "actions":[
          "Continue aggressive local resuscitation: fluids, uterotonics, uterine tamponade if indicated",
          "Consider use of O negative PRBCs if immediately available and crossmatch not possible (follow local policy)",
          "Explain delay and escalate to hospital leadership; consider diverting to nearest facility if required",
          "Document delay and rationale for any deviation from usual MTP process"
        ],
        "acceptance_criteria":[
          "Includes continued resuscitation measures, consideration of emergency O negative blood if policy allows, and escalation/documentation steps"
        ],
        "protocol_id":"mtp-obstetric-001"
      }
    }
  ]
}
