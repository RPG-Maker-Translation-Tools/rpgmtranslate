/* eslint-disable */
// This file is auto-generated. Do not edit directly.
// Extracted from HTML data-i18n attributes.
import { t } from "@lingui/core/macro";
export function _htmlTranslations() {
    // These calls exist purely so LinguiJS can extract them
    t`Core`;
    t`Appearance`;
    t`Controls`;
    t`Translation`;
    t`Project`;
    t`Backup`;
    t`Backup Interval (secs, 60-3600)`;
    t`Max Backups (1-99)`;
    t`Row Delete Mode`;
    t`Disabled`;
    t`Ask for confirmation`;
    t`Allowed`;
    t`Check for updates`;
    t`Font`;
    t`Default`;
    t`Display lines breaks in text areas`;
    t`Translation Endpoint`;
    t`You also need a folder ID from Yandex. You can find it in the same link.`;
    t`Validate Key`;
    t`Select model to use. If model you want isn't in the list, you might need to allow it in provider's settings. For example, OpenAI does not allow using GPT-5 by default.`;
    t`Token limit for request. RPGMTranslate sends files to LLMs for translation in batches, and if summed tokens of the text in all those files exceed the limit, the rest of the files will be sent in a separate request. Very high limits are discouraged because AI might hallucinate/forget, and very low limits are discouraged because your tokens will burn. RPGMTranslate also uses OpenAI's tiktoken for tokenizing inputs, and it's hardcoded even for non-OpenAI models.`;
    t`Temperature to use. Lower values produce more deterministic outputs, so it's advised to use something in range of 0.0-0.3. High values may be worse since they tune the model to be more 'creative'.`;
    t`Use glossary in the request. Very handy if you actually took your time to fill it, as it will make translation more consistent.`;
    t`Use thinking/reasoning, if available for the model. Translating with thinking most likely will use more tokens.`;
    t`Default System Prompt`;
    t`When writing system prompt, keep in mind that:`;
    t`AI response must be an array of strings in the same order as input.`;
    t`AI receives source and translaton languages as BCP-47 tags.`;
    t`You can advise AI to use delimiter comments like ID, because most likely that means a new text source and a new content.`;
    t`If you have glossary enabled, advise AI to use it, because otherwise it won't.`;
    t`Translation is most likely to be better if you will empower AI with the great knowledge about the source material. If it's shitty JRPG with intentionally bad humor and some specific lore, include that in system prompt.`;
    t`Row Length Hint`;
    t`Project Context`;
    t`File Context`;
    t`System Prompt`;
}