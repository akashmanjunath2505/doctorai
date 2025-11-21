
import { NexusContext } from '../types';

// Part of Stratum 3: Hypothesis Forge (Contextual Priors)
// Purpose: Encapsulates the medical intelligence — diagnostic frameworks, rules, and specialty-specific knowledge.
// This layer helps set the initial probabilities and context for the reasoning process.

export const applyClinicalDomainLogic = (context: NexusContext): NexusContext => {
  let domainInstruction = '';

  // 1. Specific GPT Instructions (Priority)
  if (context.activeGpt) {
    domainInstruction += `\n\n## Clinical Domain Context
This is a specialized session for: "${context.activeGpt.title}".
- **Description**: "${context.activeGpt.description}".
- **Instruction**: Focus your reasoning and response entirely within this specific clinical domain.`;
    
    if (context.activeGpt.customComponentId) {
       domainInstruction += `\n- **Output Format**: CRITICAL - Your response for this query MUST be in a structured JSON format inside a markdown block (\`\`\`json ... \`\`\`). \n- **IMPORTANT**: Do NOT provide any conversational text or preamble before the JSON block. Start your response immediately with \`\`\`json.\nThe JSON must contain a 'summary' field (string) and a 'type' field.`

       if (context.activeGpt.customComponentId === 'DifferentialDiagnosis') {
           domainInstruction += `
           Set "type" to "ddx".
           Field "data": Array of objects with keys "diagnosis", "rationale", "confidence".
           "confidence" MUST be one of: "High", "Medium", "Low".
           Field "questions": Array of strings (key questions to ask the patient to narrow down the diagnosis).
           `;
       } else if (context.activeGpt.customComponentId === 'LabResultAnalysis') {
            domainInstruction += `
            Set "type" to "lab".
            Field "data": Object matching LabResultAnalysis interface (overallInterpretation, results array).
            `;
       } else if (context.activeGpt.customComponentId === 'PregnancyRiskAssessment') {
            domainInstruction += `
            Set "type" to "risk-assessment".
            Field "data": Object matching RiskAssessmentResult interface (riskLevel, riskFactors, recommendations).
            `;
       }
    }
  }

  // 2. Universal Instructions for General Chat (Fallback/Default)
  // This ensures that even without a specific GPT selected, if the user asks for a DDx, we get the structured output.
  domainInstruction += `
  \n\n## UNIVERSAL DIAGNOSTIC PROTOCOL
  If the user provides clinical symptoms and explicitly asks for a Differential Diagnosis (DDx), "What could this be?", or a list of potential causes, AND you are not already using a different structured format:
  
  1. You MUST output your response in structured JSON format inside a markdown block.
  2. **IMPORTANT**: Do NOT provide any conversational text or preamble before the JSON block. Start your response immediately with \`\`\`json.
  3. JSON Structure:
  \`\`\`json
  {
    "summary": "Comprehensive clinical discussion...",
    "type": "ddx",
    "data": [
      { "diagnosis": "Most Likely Condition", "rationale": "Strong evidence...", "confidence": "High" },
      { "diagnosis": "Plausible Condition", "rationale": "Some evidence...", "confidence": "Medium" },
      { "diagnosis": "Less Likely / Rule Out", "rationale": "Low probability but dangerous...", "confidence": "Low" }
    ],
    "questions": [
      "Question 1 to narrow down...",
      "Question 2 about history...",
      "Question 3 about symptoms..."
    ]
  }
  \`\`\`
  4. You MUST segment the diagnoses into High, Medium, and Low confidence categories based on the available evidence.
  5. You MUST provide a list of specific "questions" to ask the patient that would help differentiate between the high-priority diagnoses.
  `;

  context.systemInstruction += domainInstruction;
  context.auditTrail.push('[Stratum 3: Hypothesis Forge] Applied clinical domain logic to shape priors.');
  
  return context;
};
