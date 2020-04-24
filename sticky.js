/**
 * OUtil qui permet de sticker un élément dans un parent au scroll.
 *
 * Le dom doit permettre d'identifier les éléments suivants :
 *  - (optionnel) Parent element wrapper qui défini les limites de stick haut et bas: data-sticky-parent
 *  - Wrapper (en fait le placeholder) : data-sticky-wrapper
 *  - Element : data-sticky-content
 *
 * Attention Sticky On Scroll ne gère rien graphiquement. Il permet juste de se brancher sur des changements d'état via
 * des events.
 *
 * ex:
 *  document.querySelectorAll('[data-sticky-content]').forEach( item => {
 *  	stickMeOnScroll(item)
 *  		.on(StickyOnScrollKeys.event.onStateChange, evt =>
 *  		{
 *  	        // Ajoute le state dans le DOM.
 *  			evt.ev_data.sticky.wrapper.setAttribute('data-sticky-parent-state', evt.ev_data.sticky.state.parent);
 *  		})
 *  });
 */
export class StickyOnScroll {

	/**
	 * Constructeur.
	 *
	 * @param $element
	 * @param options
	 */
	constructor($element, options) {
		this.$element = $element;
		this.options = {...StickyOnScroll.defaultOptions, ...options};
		this.events = [];

		// Initialisation des wrappers et contenus.
		this.initElements();

		// Initialisation de l'état.
		this.initState();

		// Ajout des behaviors.
		this.initBehaviors();
	}


	/**
	 * Initialise les éléments wrapper et container.
	 */
	initElements() {
		const wrapperSelector = this.option(StickyOnScrollKeys.options.selector.wrapper);
		const contentSelector = this.option(StickyOnScrollKeys.options.selector.content);


		// Si l'élément est un conteneur alors wrapper = element
		if (this.$element.matches(wrapperSelector)) {
			const $content = this.$element.querySelectorAll(contentSelector);
			if ($content.length) {
				this.$wrapper = this.$element;
				this.$content = $content;
				return;
			}

			throw 'L\'élément ne contient pas de content ' + contentSelector;
		}


		// Si l'élément est un contenu alors wrapper = parent.
		if (this.$element.matches(contentSelector)) {
			const $wrapper = this.getParents(this.$element, wrapperSelector)
			if ($wrapper) {
				this.$wrapper = $wrapper;
				this.$content = this.$element;
				return;
			}

			throw 'L\'élément ne contient pas de wrapper ' + wrapperSelector;
		}

		throw 'L\'élément ne contient ni wrapper ' + wrapperSelector + ' ni contenu ' + contentSelector;
	}

	/**
	 * Initialise l'état initial de l'élément.
	 */
	initState() {
		this.initConstants();

		const suffix = 100000;
		this.stickyId = '_' + (this.wrapperTop * suffix + Math.round(Math.random() * suffix));
		this.$element.setAttribute(StickyOnScrollKeys.attr.stickyId, this.stickyId);

		this.state = {
			sticky: -1,
			match: -1,
			parent: -1,
		};
	}

	/**
	 * Initialisaiton des constantes de hauteur.
	 */
	initConstants() {
		this.wrapperTop = this.getOffset(this.$wrapper).top;
		// this.wrapper.css('height', this.$content.outerHeight());
		this.wrapper.style['--stickyWrapperHeight'] = this.$content.offsetHeight + 'px';

		this.initThresholds();
		//this.content.css("top", this.destinationTop);
		this.content.style['--stickyContentTop'] = this.destinationTop;
	}

	/**
	 * Vérifie si il y a un parent et initialise les constantes.
	 *
	 * Si il y a un parent le sticky ne sera ajouté que dans la limite de l'élément data-sticky-parent
	 */
	hasParent() {
		if (typeof (this.$parent) == 'undefined') {
			const parents = this.getParents(this.$wrapper, this.option(StickyOnScrollKeys.options.selector.parent));
			if (parents) {
				this.$parent = parents;
				return true;
			}
			this.$parent = false;
			return false;
		}

		return this.$parent !== false;
	}

	/**
	 * Initialise le seuils de
	 */
	initThresholds() {
		this.threshold = 0;
		this.destinationTop = 0;

		if (StickyOnScroll.stickiesList) {
			for (let i in StickyOnScroll.stickiesList.all) {
				const sticky = StickyOnScroll.stickiesList.all[i];
				if (sticky.stickyId == this.stickyId) {
					return;
				}

				const height = sticky.element.offsetHeight;
				this.threshold += height;
				this.destinationTop += height;
			}
		}

		// Initialisation du seuil bas en cas de parent.
		if (this.hasParent()) {
			this.bottomThreshold = this.getOffset(this.$parent).top + this.$parent.offsetHeight;
		}
	}

	/**
	 * Ajoute l'élément a la table.
	 * @param table
	 */
	addToTable(table) {
		table.push(this);
		this.sort(table);
	}

	/**
	 * Supprime l'élément à la table
	 * @param table
	 */
	removeFromTable(table) {
		const index = table.indexOf(this);
		if (index > -1) {
			table.splice(index, 1);
		}
	}

	/**
	 * Trie le tableau par top
	 */
	sort(table) {
		table.sort(function (a, b) {
			return a.wrapperTop - b.wrapperTop;
		});
	}

	/**
	 * Retourne vrai si l'état a changé en fonction du nouveau scrollTop
	 * @param newScrollTop
	 */
	stateHasChange(newScrollTop) {

		const isSticky = this.isSticky(newScrollTop);
		let result;

		if (this.state.sticky == -1) {
			this.state.sticky = isSticky;
			result = true;
		} else {

			if (
				(this.state.sticky === true && !isSticky)
				|| (this.state.sticky === false && isSticky)
			) {
				this.state.sticky = isSticky;
				result = true;
			} else {
				result = false;
			}
		}

		// Threshold.
		if (result) {
			if (this.state.sticky) {
				StickyOnScroll.top_threshold += this.$content.offsetHeight;
				this.initThresholds();
			} else if (StickyOnScroll.top_threshold > 0) {
				StickyOnScroll.top_threshold -= this.$content.offsetHeight;
			}

			// Initialisation du parent state.
			if (this.hasParent()) {
				this.initParentState(newScrollTop);
			}
		}


		return result;
	}

	/**
	 * Retourne vrai si l'élément doit être sticky en fonction newScrollTop si l'option parent n'est pas activée.
	 * @param newScrollTop
	 * @returns {boolean}
	 */
	isStickyWithoutParent(newScrollTop) {
		return newScrollTop + this.threshold > this.wrapperTop;
	}

	/**
	 * Retourne vrai si l'élément doit être sticky en fonction newScrollTop si l'option parent est activée.
	 * @param newScrollTop
	 * @returns {boolean}
	 */
	isStickyInParent(newScrollTop) {
		return this.contentTopIsUnderParentTop(newScrollTop) && !this.contentBottomIsUnderParentBottom(newScrollTop);
	}

	/**
	 *
	 */
	initParentState(newScrollTop) {

		if (newScrollTop + this.threshold < this.wrapperTop) {
			this.state.parent = StickyOnScrollKeys.parent.upon;
		} else if (this.isStickyInParent(newScrollTop)) {
			this.state.parent = StickyOnScrollKeys.parent.in;
		} else if (this.contentBottomIsUnderParentBottom(newScrollTop)) {
			this.state.parent = StickyOnScrollKeys.parent.under;
		}
	}

	/**
	 * Return true if content top is under parent top.
	 *
	 * @param newScrollTop
	 * @returns {boolean}
	 */
	contentTopIsUnderParentTop(newScrollTop){
		return newScrollTop + this.threshold > this.wrapperTop
	}

	contentBottomIsUnderParentBottom(newScrollTop) {
		return newScrollTop + (this.threshold + this.$content.offsetHeight) > this.getOffset(this.$parent).top + this.$parent.offsetHeight
	}

	/**
	 * Return l'option de match.
	 *
	 * @returns {*}
	 */
	getMatchOption() {
		return this.option(StickyOnScrollKeys.options.behaviors.matchMedia);
	}

	/**
	 * Retourne vrai si l'option match.
	 *
	 * @returns {boolean}
	 */
	isMatchEnabled() {
		if (this.getMatchOption()) {
			return this.matchIsEnabled;
		}
		return true;
	}

	/**
	 * Getter/Setter.
	 * @param key
	 * @param data
	 * @returns {*}
	 */
	option(key, data) {
		if ('undefined' == typeof data) {
			return this.options[key];
		} else {
			this.options[key] = data;
		}
	}

	/**
	 * Gestion des behaviors.
	 */
	initBehaviors() {
		if ("undefined" == typeof StickyOnScroll.direction) {
			StickyOnScroll.initScrollManager();
		}
	}

	/**
	 * Listen.
	 *
	 * @param event
	 * @param callback
	 * @returns {StickyOnScroll}
	 */
	on(event, callback) {

		if (this.getMatchOption()) {
			if (event == StickyOnScrollKeys.event.onMatchChange) {
				this.matchIsEnabled = true;
				// Si on est hors matchoption, on listen direct.
				this.enableListener(event, callback);
			} else {
				// On ajoute à la liste des events.
				this.events.push({event: event, callback: callback});
			}
		} else {
			// Si on est hors matchoption, on listen direct.
			this.enableListener(event, callback);
		}

		// On balance les événements de window pour simuler une modification d'état.
		if (this.getMatchOption()) {
			this.initOnWindowResize(true);
			StickyOnScroll.onScroll(window.scrollY);

		}

		return this;
	}

	/**
	 * Délisten.
	 *
	 * @param event
	 * @param callback
	 * @returns {StickyOnScroll}
	 */
	off(event, callback) {
		// On appelle les hooks.
		if (this.hooks(['before', 'Off'], event)) {
			this.element.removeEventListener(event, callback);
			this.hooks(['after', 'Off'], event);
		}

		return this;
	}

	/**
	 * Action lors du resize de la fenêtre.
	 */
	initOnWindowResize(force) {
		this.initConstants();
		const match = this.getMatchOption();


		const ev = new Event(StickyOnScrollKeys.event.onMatchChange)
		ev.ev_data = {sticky: this}
		if (this.state.match === -1) {
			this.state.match = window.matchMedia(match).matches;
			if (this.state.match) {
				this.enableAllListeners();
				this.element.dispatchEvent(ev);
			}
		} else {
			if ((force && this.state.match)
				|| window.matchMedia(match).matches && !this.state.match) {
				this.state.match = true;
				this.enableAllListeners();
				this.element.dispatchEvent(ev);
			}
			if ((force && !this.state.match)
				|| !window.matchMedia(match).matches && this.state.match) {
				this.state.match = false;
				this.disableAllListener();
				this.element.dispatchEvent(ev);
			}
		}

		return this;
	}

	/**
	 * Modifie les constantes des éléments.
	 */
	dispatchStateHasChange() {
		if (StickyOnScroll.stickiesList) {
			StickyOnScroll.stickiesList.all.map((sticky) => {
				sticky.initConstants();
			});
		}
	}

	/**
	 *
	 * @param DOMElement element
	 **/
	getParents(element, selector){
		if( element.parentElement){
			if (element.parentElement.matches(selector)){
				return element.parentElement
			}
			else{
				return this.getParents(element.parentElement, selector)
			}
		}
		return null
	}

	getOffset(element){
		const rect = element.getBoundingClientRect()
		return {
			top: rect.top + window.scrollY,
			left: rect.left + window.scrollX,
		};
	}

	/**======================================================
	 ||                                                   ||
	 ||                  Gestion des événements              ||
	 ||                                                   ||
	 =======================================================*/
	/**
	 * Acive tous les listeners en fonctin du match.
	 */
	enableAllListeners() {
		this.events.map((data) => this.enableListener(data.event, data.callback));
	}

	/**
	 * Désactive tous les listeners en fonction du match.
	 */
	disableAllListener() {
		this.events.map((data) => this.disableListener(data.event, data.callback));
	}

	/**
	 * Active un listener.
	 * @param event
	 * @param callback
	 */
	enableListener(event, callback) {
		if (this.hooks(['before', 'On'], event)) {
			this.$element.addEventListener(event, callback);
			this.hooks(['after', 'On'], event);
		}
	}

	/**
	 * Désactive un listener.
	 * @param event
	 * @param callback
	 */
	disableListener(event, callback) {
		if (this.hooks(['before', 'Off'], event)) {
			this.$element.removeEventListener(event, callback);
			this.hooks(['after', 'Off'], event);
		}
	}

	/**
	 * Gestion du hook sur l'activation désactivation de listener
	 */
	hooks(type, event) {
		// On appelle les hooks.
		let method = "hook" + StickyOnScroll.camelSentence(type.join(' ') + ' ' + event);
		if ('function' == typeof this[method]) {
			return this[method].call(this);
		}
		return true;
	}

	/**
	 * Hook avant le on direction changed
	 */
	hookBeforeOnStickyScrollDirectionHasChanged() {
		this.addToTable(StickyOnScroll.stickiesList[StickyOnScrollKeys.event.onDirectionChange]);
		return true;
	}

	/**
	 * Hook arpès le on Direction Change.
	 */
	hookBeforeOffStickyScrollDirectionHasChanged() {
		this.removeFromTable(StickyOnScroll.stickiesList[StickyOnScrollKeys.event.onDirectionChange]);
		return true;
	}

	/**
	 * Hook avant le on state changed
	 */
	hookBeforeOnStickyStateHasChanged() {

		// On définie la bonne fonction à appeler.
		this.isSticky = this.hasParent() ? this.isStickyInParent : this.isStickyWithoutParent;

		this.addToTable(StickyOnScroll.stickiesList[StickyOnScrollKeys.event.onStateChange]);
		return true;
	}

	/**
	 * Hook after le off state changed.
	 */
	hookBeforeOffStickyStateHasChanged() {
		this.removeFromTable(StickyOnScroll.stickiesList[StickyOnScrollKeys.event.onStateChange]);
		return true;
	}

	/**======================================================
	 ||                                                   ||
	 ||                  Accesseurs                      ||
	 ||                                                   ||
	 =======================================================*/
	get element() {
		return this.$element;
	}

	get wrapper() {
		return this.$wrapper;
	}

	get content() {
		return this.$content;
	}

	/**======================================================
	 ||                                                   ||
	 ||                  Static                      ||
	 ||                                                   ||
	 =======================================================*/
	/**
	 * @param element
	 */
	static create($element, options) {
		// Initialisation de l'object global.
		StickyOnScroll.initDefaultOptions();

		// Création du sticky on scroll
		const sticky = new StickyOnScroll($element, options);

		sticky.addToTable(StickyOnScroll.stickiesList.all);
		return sticky;
	}


	/**
	 * Initialisation des données par défaut.
	 */
	static initDefaultOptions() {
		if ('undefined' == typeof StickyOnScroll.defaultOptions) {
			StickyOnScroll.defaultOptions = {};
			StickyOnScroll.defaultOptions[StickyOnScrollKeys.options.selector.wrapper] = '[data-sticky-wrapper]';
			StickyOnScroll.defaultOptions[StickyOnScrollKeys.options.selector.content] = '[data-sticky-content]';
			StickyOnScroll.defaultOptions[StickyOnScrollKeys.options.selector.parent] = '[data-sticky-parent]';
		}
	}

	/**
	 * Initialise le scroll manager
	 */
	static initScrollManager() {
		// Initialisation des données.
		StickyOnScroll.top_threshold = 0;
		StickyOnScroll.direction = StickyOnScrollKeys.direction.stable;
		StickyOnScroll.previousScrollTop = window.scrollY;
		StickyOnScroll.stickiesList = {
			'all': [],
		};
		StickyOnScroll.stickiesList[StickyOnScrollKeys.event.onDirectionChange] = [];
		StickyOnScroll.stickiesList[StickyOnScrollKeys.event.onStateChange] = [];

		// Ecoute du scroll.
		window.addEventListener('scroll', () => {
			StickyOnScroll.onScroll(window.scrollY);
		});

		// Ecoute de la modification de taille d'écran.
		window.addEventListener('resize', () => {
			StickyOnScroll.onWindowResize();
		})
	}

	/**
	 * Actions au scroll
	 *
	 * @param scrollTop
	 */
	static onScroll(scrollTop) {
		const delta = StickyOnScroll.previousScrollTop - scrollTop;
		let directionHasChange = false,
			eventData = {};

		// On assigne le nouveau scrollTop
		StickyOnScroll.previousScrollTop = window.scrollY;

		// On détecte si la direction à changer.
		if (delta < 0 && StickyOnScroll.direction != StickyOnScrollKeys.direction.down) {
			directionHasChange = true;
			StickyOnScroll.direction = StickyOnScrollKeys.direction.down;
		}
		if (delta > 0 && StickyOnScroll.direction != StickyOnScrollKeys.direction.up) {
			directionHasChange = true;
			StickyOnScroll.direction = StickyOnScrollKeys.direction.up;
		}

		// On ajoute les data d'événements.
		eventData.delta = delta;
		eventData.direction = StickyOnScroll.direction;
		eventData.scroll = scrollTop;

		// Gestion de la direction.
		if (directionHasChange) {
			StickyOnScroll.stickiesList[StickyOnScrollKeys.event.onDirectionChange].map((sticky) => {
				const ev = new Event(StickyOnScrollKeys.event.onDirectionChange)
				ev.ev_data = {...eventData, ...{sticky: sticky}}
				sticky.element.dispatchEvent(ev);
			})
		}

		// Gestion du state.
		StickyOnScroll.stickiesList[StickyOnScrollKeys.event.onStateChange].map((sticky) => {
			if (sticky.stateHasChange(scrollTop)) {
				const ev = new Event(StickyOnScrollKeys.event.onStateChange)
				ev.ev_data = {...eventData, ...{sticky: sticky}}
				sticky.element.dispatchEvent(ev)
			}
		});
	}

	/**
	 * Action quand la window resize.
	 */
	static onWindowResize() {
		// On parcours la liste des éléments.
		StickyOnScroll.stickiesList.all.map((sticky) => {
			sticky.initOnWindowResize();
		})
	}


	/**
	 * Retourne le camel case.
	 * @param str
	 * @returns {string}
	 */
	static camelSentence(str) {
		return (" " + str).toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, function (match, chr) {
			return chr.toUpperCase();
		});
	}

	static getStickyByElement($element) {
		const stickyId = $element.getAttribute(StickyOnScrollKeys.attr.stickyId);
		if (stickyId) {
			return StickyOnScroll.getStickyByStickyId(stickyId);
		}
		return null;
	}

	static getStickyByStickyId(stickyId) {
		if (StickyOnScroll.stickiesList) {
			return StickyOnScroll.stickiesList.all.find(function (element) {
				return element.stickyId == stickyId;
			})
		}

		return null;
	}

	static getCurrentThreshold() {
		return StickyOnScroll.top_threshold ? StickyOnScroll.top_threshold : 0;
	}
}

/**
 * Options.
 *
 * @type {string}
 */
export const StickyOnScrollKeys = {
	attr: {
		stickyId: 'data-sticky-id',
	},
	direction: {
		up: 'up',
		down: 'down',
		stable: 'stable',
	},
	event: {
		onDirectionChange: 'sticky-scroll-direction-has-changed',
		onStateChange: 'sticky-state-has-changed',
		onMatchChange: 'sticky-match-has-changed',
	},
	options: {
		selector: {
			wrapper: 'wrapper-selector',
			content: 'content-selector',
			parent: 'parent-selector',
		},
		behaviors: {
			matchMedia: 'match-media',
		}
	},
	parent: {
		upon: 'screenUponParent',
		in: 'screenInParent',
		under: 'screenUnderParent',
	}

};


/**
 * Ajout d'une méthode jQuery
 */
export function stickMeOnScroll(element, options) {
	const sticky = StickyOnScroll.getStickyByElement(element);
	return sticky ? sticky : StickyOnScroll.create(element, options);
}
