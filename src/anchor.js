/**
 * Permet d'identifier l'affichage ou non des éléments d'une ancre à l'écran.
 *
 * anchorMeOnScroll prend en paramètre la bare de navigation.
 *
 *
 * Ex :
 *  document.querySelectorAll('nav.anchor').forEach( item => {
 *  	anchorMeOnScroll(item)
 *  		.on( AnchorOnScrollKeys.event.onStateChange, (evt) => {
 *  			document.querySelectorAll('nav.anchor .on').forEach(item=> {item.classList.remove('on')})
 *  			evt.ev_data.anchor.anchor.classList.add("on")
 *  		})
 *  })
 */
export class AnchorOnScroll {

	/**
	 * Constructeur.
	 *
	 * @param $element
	 * @param options
	 */
	constructor($element, options) {
		this.$element = $element;
		this.options = {...AnchorOnScroll.defaultOptions, ...options};


		// Initialisation de l'état.
		this.initState();

		// Ajout des behaviors.
		this.initBehaviors();
	}

	initBehaviors() {
		this.initConstants();

		this.current = -1;


		window.addEventListener("resize", () => this.initConstants());
		window.addEventListener("scroll", () => this.onScroll());
		window.addEventListener(AnchorOnScrollKeys.event.sizeCouldHaveChange, () => this.initConstants());

		window.setInterval(() => this.initConstants(), 2000);
	}

	initState() {
		const suffix = 100000;
		this.id = '_' + Math.round(Math.random() * suffix);
		this.$element.setAttribute(AnchorOnScrollKeys.attr.id, this.id);
	}

	initConstants() {
		this.anchors = [];
		this.$element.querySelectorAll('[href^="#"]').forEach($anchor => {
			const $destination = document.querySelectorAll($anchor.getAttribute('href'));
			$destination.forEach( $dest => {
				this.anchors.push(this.initDestinationElement($dest, $anchor));
			})
		});

		// On sort dans l'ordre top.
		this.anchors.sort((a, b) => {
			return a.top - b.top;
		});
	}

	onScroll() {
		const windowHeight = window.innerHeight;
		const threshold = windowHeight / 4;
		const winTop = window.scrollY + threshold;
		let result = null;
		this.anchors.map((data) => {

			if (data.top < winTop) {
				result = data;
			}
		});

		if ((typeof result !== 'undefined') && result) {
			if (this.current == -1 || result.id != this.current.id) {
				this.current = result;
				const evt = new Event(AnchorOnScrollKeys.event.onStateChange)
				evt.ev_data = {anchor: this.current}
				this.$element.dispatchEvent(evt);
			}
		}
	}

	/**
	 * Retourne un tableau avec les constantes.
	 * @param $elem
	 * @param $anchor
	 * @returns {{top: *, bottom: *, destination: *, anchor: *, id: *}}
	 */
	initDestinationElement($elem, $anchor) {
		const top = $elem.getBoundingClientRect().top + window.scrollY;
		return {
			'top': top,
			'bottom': top + $elem.innerHeight,
			'destination': $elem,
			'anchor': $anchor,
			'id': $elem.getAttribute('id'),
		};
	}

	/**
	 * Ajoute l'élément a la table.
	 * @param table
	 */
	addToTable(table) {
		table.push(this);
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

	/**======================================================
	 ||                                                   ||
	 ||                  Evenements                      ||
	 ||                                                   ||
	 =======================================================*/
	/**
	 * Listen.
	 *
	 * @param event
	 * @param callback
	 * @returns {StickyOnScroll}
	 */
	on(event, callback) {

		this.$element.addEventListener(event, callback);

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
		this.element.removeEventListener(event, callback);

		return this;
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
		AnchorOnScroll.initDefaultOptions();

		// Création du sticky on scroll
		const sticky = new AnchorOnScroll($element, options);
		sticky.addToTable(AnchorOnScroll.list.all);
		return sticky;
	}

	static getById(id) {
		if (AnchorOnScroll.list) {
			return AnchorOnScroll.list.all.find(function (element) {
				return element.id == id;
			})
		}

		return null;
	}

	/**
	 * Initialisation des données par défaut.
	 */
	static initDefaultOptions() {
		if ('undefined' == typeof AnchorOnScroll.defaultOptions) {
			AnchorOnScroll.list = {
				'all': [],
			};

			AnchorOnScroll.defaultOptions = {};
		}
	}
}

export const AnchorOnScrollKeys = {
	attr: {
		id: 'data-anchor-id',
	},
	event: {
		onStateChange: 'anchor-state-has-changed',
		sizeCouldHaveChange: 'size-could-have-change',
	},
	options: {
		selector: {
			wrapper: 'wrapper-selector',
		},
	}
}


/**
 * Ajout d'une méthode jQuery
 */
export function anchorMeOnScroll(element, options) {
	const anchor = AnchorOnScroll.getById(element, options);
	return anchor ? anchor : AnchorOnScroll.create(element, options);
}
