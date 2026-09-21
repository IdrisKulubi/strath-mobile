export function flags(userId:string){
 const ready=process.env.QUESTIONNAIRE_SCHEMA_READY==="true";
 const cohort=process.env.QUESTIONNAIRE_USER_IDS?.split(",").map(x=>x.trim())??[];
 const included=cohort.includes("*")||cohort.includes(userId);
 return {collection:ready&&included&&process.env.QUESTIONNAIRE_COLLECTION_ENABLED==="true",matching:ready&&included&&process.env.QUESTIONNAIRE_MATCHING_ENABLED==="true",shell:ready&&included&&process.env.QUESTIONNAIRE_SHELL_ENABLED==="true"};
}
