const translations = {
  GREETINGS: {
    en: "Hi"
  }
}

module.exports = {
  getTranslation: (key, lang) => (translations[key][lang])
}
