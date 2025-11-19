import { NexusContext } from '../types';

// Part of Stratum 3: Hypothesis Forge (Contextual Priors)
// Purpose: Encapsulates the medical intelligence — diagnostic frameworks, rules, and specialty-specific knowledge.
// This layer helps set the initial probabilities and context for the reasoning process.
//
// NOTE: This prototype appends specialized instructions to the system prompt based on the active "GPT" selected in the UI.

export const applyClinicalDomainLogic = (context: NexusContext): NexusContext => {
  let domainInstruction = '';

  if (context.activeGpt) {
    domainInstruction += `\n\n## Clinical Domain Context
This is a specialized session for: "${context.activeGpt.title}".
- **Description**: "${context.activeGpt.description}".
- **Instruction**: Focus your reasoning and response entirely within this specific clinical domain.`;
    
    if (context.activeGpt.customComponentId) {
       domainInstruction += `\n- **Output Format**: CRITICAL - Your response for this query MUST be in a structured JSON format inside a markdown block (\`\`\`json ... \`\`\`). The JSON must contain a 'summary' field (a string for display) and a 'data' field with the structured information.`
    }
  }

  // This logic is appended to the system instruction later by the orchestrator.
  context.systemInstruction += domainInstruction;
  context.auditTrail.push('[Stratum 3: Hypothesis Forge] Applied clinical domain logic to shape priors.');
  
  return context;
};