export function flags(){
 const ready=process.env.QUESTIONNAIRE_SCHEMA_READY==="true";
 const collection=ready&&process.env.QUESTIONNAIRE_COLLECTION_ENABLED==="true";
 return {
  collection,
  matching:collection&&process.env.QUESTIONNAIRE_MATCHING_ENABLED==="true",
  shell:collection&&process.env.QUESTIONNAIRE_SHELL_ENABLED==="true",
 };
}
