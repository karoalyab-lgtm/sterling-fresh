(function () {
    var supportedLanguages = ['es', 'en'];
    var defaultLanguage = 'es';
    var currentLanguage = defaultLanguage;
    var currentTranslations = {};

    function getByPath(obj, path) {
        return String(path).split('.').reduce(function (acc, part) {
            if (acc && Object.prototype.hasOwnProperty.call(acc, part)) {
                return acc[part];
            }
            return null;
        }, obj);
    }

    function getValue(translations, key) {
        if (!translations || !key) {
            return null;
        }

        if (Object.prototype.hasOwnProperty.call(translations, key)) {
            return translations[key];
        }

        return getByPath(translations, key);
    }

    function normalizeLanguage(lang) {
        if (!lang) {
            return defaultLanguage;
        }

        var short = String(lang).toLowerCase().split('-')[0];
        return supportedLanguages.indexOf(short) !== -1 ? short : defaultLanguage;
    }

    function getPageKey() {
        var bodyPage = document.body ? document.body.getAttribute('data-i18n-page') : null;
        if (bodyPage) {
            return bodyPage;
        }

        var fileName = globalThis.location.pathname.split('/').pop().toLowerCase();
        return fileName === 'products.html' ? 'products' : 'index';
    }

    function getSwitcherButtons() {
        return document.querySelectorAll('[data-lang-switch], .lang-item[data-lang]');
    }

    function getButtonLanguage(button) {
        return button.getAttribute('data-lang-switch') || button.getAttribute('data-lang');
    }

    function updateSwitcherState(lang) {
        Array.prototype.forEach.call(getSwitcherButtons(), function (button) {
            var isActive = getButtonLanguage(button) === lang;
            button.classList.toggle('active', isActive);
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function applyTranslations(translations, lang) {
        var textNodes = document.querySelectorAll('[data-i18n]');
        Array.prototype.forEach.call(textNodes, function (node) {
            var value = getValue(translations, node.getAttribute('data-i18n'));
            if (typeof value === 'string') {
                node.textContent = value;
            }
        });

        var htmlNodes = document.querySelectorAll('[data-i18n-html]');
        Array.prototype.forEach.call(htmlNodes, function (node) {
            var value = getValue(translations, node.getAttribute('data-i18n-html'));
            if (typeof value === 'string') {
                node.innerHTML = value;
            }
        });

        var contentNodes = document.querySelectorAll('[data-i18n-content]');
        Array.prototype.forEach.call(contentNodes, function (node) {
            var value = getValue(translations, node.getAttribute('data-i18n-content'));
            if (typeof value === 'string') {
                node.setAttribute('content', value);
            }
        });

        var placeholderNodes = document.querySelectorAll('[data-i18n-placeholder]');
        Array.prototype.forEach.call(placeholderNodes, function (node) {
            var value = getValue(translations, node.getAttribute('data-i18n-placeholder'));
            if (typeof value === 'string') {
                node.setAttribute('placeholder', value);
            }
        });

        var altNodes = document.querySelectorAll('[data-i18n-alt]');
        Array.prototype.forEach.call(altNodes, function (node) {
            var value = getValue(translations, node.getAttribute('data-i18n-alt'));
            if (typeof value === 'string') {
                node.setAttribute('alt', value);
            }
        });

        var ariaNodes = document.querySelectorAll('[data-i18n-aria-label]');
        Array.prototype.forEach.call(ariaNodes, function (node) {
            var value = getValue(translations, node.getAttribute('data-i18n-aria-label'));
            if (typeof value === 'string') {
                node.setAttribute('aria-label', value);
            }
        });

        if (typeof translations.pageTitle === 'string') {
            document.title = translations.pageTitle;
        }

        var metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription && typeof translations.pageDescription === 'string') {
            metaDescription.setAttribute('content', translations.pageDescription);
        }

        var metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords && typeof translations.pageKeywords === 'string') {
            metaKeywords.setAttribute('content', translations.pageKeywords);
        }

        document.documentElement.lang = lang;
        currentLanguage = lang;
        currentTranslations = translations;
        updateSwitcherState(lang);

        globalThis.dispatchEvent(new CustomEvent('site-language-changed', {
            detail: {
                language: lang,
                translations: translations,
                page: getPageKey()
            }
        }));
    }

    function fetchTranslations(lang) {
        return fetch('lang/' + lang + '.json', { cache: 'no-cache' }).then(function (response) {
            if (!response.ok) {
                throw new Error('Missing translation file');
            }

            return response.json();
        }).then(function (allTranslations) {
            var pageKey = getPageKey();
            var common = allTranslations.common || {};
            var page = allTranslations[pageKey] || {};
            return Object.assign({}, common, page);
        });
    }

    function setLanguage(lang) {
        var normalized = normalizeLanguage(lang);
        return fetchTranslations(normalized).then(function (translations) {
            applyTranslations(translations, normalized);
            globalThis.localStorage.setItem('site-language', normalized);
            return normalized;
        }).catch(function () {
            if (normalized !== defaultLanguage) {
                return setLanguage(defaultLanguage);
            }

            return defaultLanguage;
        });
    }

    function getInitialLanguage() {
        var saved = globalThis.localStorage.getItem('site-language');
        if (saved) {
            return normalizeLanguage(saved);
        }

        return normalizeLanguage(globalThis.navigator.language || document.documentElement.lang);
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.addEventListener('click', function (event) {
            var button = event.target.closest('[data-lang-switch], .lang-item[data-lang]');
            if (!button) {
                return;
            }

            event.preventDefault();
            setLanguage(getButtonLanguage(button));
        });

        setLanguage(getInitialLanguage());
    });

    globalThis.addEventListener('storage', function (event) {
        if (event.key === 'site-language' && event.newValue) {
            var nextLanguage = normalizeLanguage(event.newValue);
            if (nextLanguage !== currentLanguage) {
                setLanguage(nextLanguage);
            }
        }
    });

    globalThis.siteI18n = {
        getLanguage: function () {
            return currentLanguage;
        },
        getTranslations: function () {
            return currentTranslations;
        },
        getValue: function (key) {
            return getValue(currentTranslations, key);
        },
        setLanguage: setLanguage
    };
})();