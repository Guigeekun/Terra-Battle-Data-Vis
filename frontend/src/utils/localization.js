import { speciesTranslations } from './constants';

export function getLocalizedString(stringObj, fallback = '-') {
  if (!stringObj) return fallback;
  // lang is passed in or defaults to 'en'
  return stringObj.__currentLang || stringObj['en'] || stringObj['ja'] || fallback;
}

// A version that takes lang explicitly (preferred in React)
export function loc(stringObj, lang = 'en', fallback = '-') {
  if (!stringObj) return fallback;
  return stringObj[lang] || stringObj['en'] || stringObj['ja'] || fallback;
}

export function translateStageTitle(rawTitle, lang, strings) {
  if (!rawTitle) return 'Section Details';

  const match = rawTitle.match(/^\[(.*?)\]\s*(.*?)\s*-\s*(\d+)$/);
  if (match) {
    const chName = match[1];
    const speciesName = match[2];
    const num = match[3];

    let chTrans = chName;
    if (strings?.scenarioSet) {
      const entry = strings.scenarioSet.find(x => x.ja && x.ja.includes(chName));
      if (entry && entry[lang]) {
        chTrans = entry[lang].replace(/^Ch\s*\d+:\s*/i, '').replace(/^第\d+章\s*/, '');
      }
    }

    const speciesMap = {
      'ヒト': speciesTranslations[0],
      'トカゲ': speciesTranslations[1],
      'ケモノ': speciesTranslations[2],
      '岩人': speciesTranslations[3]
    };

    let spTrans = speciesName;
    if (speciesMap[speciesName]?.[lang]) {
      spTrans = speciesMap[speciesName][lang];
    }

    return `[${chTrans}] ${spTrans} - ${num}`;
  }
  return rawTitle;
}
