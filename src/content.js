/**
 * Content script.
 *
 * @description File that will be used as a content script.
 * @example init()
 * @version 1.0.0
 *
 */
async function init() {

	var pills = [], links, container, btn, div, title, content, i

	content = document.querySelector( '#bodyContent' )

	if ( !content ) return

	links = content.querySelectorAll( 'p > a' )

	if ( !links ) return

	container = document.createElement( 'div' )
	container.classList.add( 'pigeon-w-container' )
	container.classList.add( 'slides' )
	container.classList.add( 'vector-body' )

	if ( content.previousElementSibling.id == 'firstHeading' ) {

		container.setAttribute( 'style', 'padding-top:0' )

	}

	for ( i = 0; i < links.length; i++ ) {

		div = document.createElement( 'div' )
		div.setAttribute( 'class', 'slides-' + 1 )

		btn = document.createElement( 'a' )
		btn.setAttribute( 'href', links[i].href )

		if ( links[i].href != '' && links[i].innerText != '' ) {

			pills.push( buildPill( btn, links[i].innerText ) )

			div.appendChild( btn )
			container.appendChild( div )

		}

	}

	title = document.querySelector( 'h1' )

	if ( title && title.innerText != '' ) content.before( container )

	loadAll( pills )

}

/**
 * Get the page title (as used by the API) from a link.
 *
 * @param   {string}      href - Link url.
 * @returns {string|null}      - Page title.
 */
function getPageTitle( href ) {

	var url = new URL( href ),
		param = url.searchParams.get( 'title' )

	if ( param ) return param.replace( /_/g, ' ' )
	if ( !url.pathname.startsWith( '/wiki/' ) ) return null

	return decodeURIComponent( url.pathname.replace( '/wiki/', '' ) ).replace( /_/g, ' ' )

}

/**
 * Limit an extract to its first two paragraphs and a maximum length.
 *
 * @param   {string} text - Full extract.
 * @returns {string}      - Short extract.
 */
function shorten( text ) {

	var max = 400,
		short = text.split( /\n+/ ).filter( Boolean ).slice( 0, 2 ).join( '\n' ),
		cut

	if ( short.length <= max ) return short

	cut = short.slice( 0, max )

	return cut.slice( 0, Math.max( cut.lastIndexOf( ' ' ), 0 ) ) + '…'

}

/**
 * Query the API for a batch of titles (follows continuation).
 *
 * @param   {string[]}        titles - Page titles.
 * @returns {Promise<object>}        - Map of resolved title to info.
 */
async function fetchChunk( titles ) {

	var base = location.origin + '/w/api.php?action=query&format=json&redirects=1&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=160&pilimit=max&exintro=1&explaintext=1&exsentences=2&exlimit=max&titles=' + encodeURIComponent( titles.join( '|' ) ),
		pages = {},
		map   = {},
		cont  = '',
		data, q

	do {

		data = await ( await fetch( base + cont ) ).json()
		q    = data.query || {}

		; ( q.normalized || [] ).concat( q.redirects || [] ).forEach( m => map[m.from] = m.to )

		Object.values( q.pages || {} ).forEach( p => {

			var cur = pages[p.title] || ( pages[p.title] = {
				name : p.title, extract : '', image : '', 
			} )

			if ( p.thumbnail ) cur.image = p.thumbnail.source
			if ( p.extract ) cur.extract = shorten( p.extract )

		} )

		cont = data.continue ? '&' + new URLSearchParams( data.continue ).toString() : ''

	} while ( cont )

	titles.forEach( t => {

		var r = map[t] || t

		if ( map[r] ) r = map[r]
		if ( pages[r] ) pages[t] = pages[r]

	} )

	return pages

}

/**
 * Load info of every pill in batches.
 *
 * @param {object[]} pills - Pills from buildPill.
 */
async function loadAll( pills ) {

	var size = 20,
		i, chunk, titles, pages

	for ( i = 0; i < pills.length; i += size ) {

		chunk  = pills.slice( i, i + size ).filter( p => p.title )
		titles = [
			...new Set( chunk.map( p => p.title ) ), 
		]

		if ( !titles.length ) continue

		try {

			pages = await fetchChunk( titles )

		} catch ( e ) {

			continue

		}

		chunk.forEach( p => pages[p.title] && p.apply( pages[p.title] ) )

	}

}

// eslint-disable-next-line vars-on-top
var popup

/**
 * Show a short popup with the page extract under a pill.
 *
 * @param {HTMLElement} btn  - Pill link.
 * @param {string}      text - Popup text.
 */
function showPopup( btn, text ) {

	var r = btn.getBoundingClientRect(),
		left

	if ( !popup ) {

		popup = document.createElement( 'div' )
		popup.classList.add( 'pigeon-w-popup' )
		document.body.appendChild( popup )

	}

	popup.innerText     = text
	popup.style.display = 'block'

	left = Math.min( Math.max( 8, r.left ), window.innerWidth - popup.offsetWidth - 8 )

	popup.style.left = left + 'px'
	popup.style.top  = ( r.bottom + 8 ) + 'px'

}

/**
 * Build the pill content.
 *
 * @param   {HTMLElement} btn  - Pill link.
 * @param   {string}      text - Link text.
 * @returns {object}           - Pill with its title and an apply function.
 */
function buildPill( btn, text ) {

	var nameEl = document.createElement( 'span' ),
		img     = document.createElement( 'img' ),
		extract = ''

	nameEl.classList.add( 'pigeon-w-name' )
	img.classList.add( 'pigeon-w-img' )
	img.alt = ''

	nameEl.innerText = text

	btn.appendChild( nameEl )
	btn.appendChild( img )

	btn.addEventListener( 'mouseenter', () => {

		if ( extract ) {

			btn.removeAttribute( 'title' )
			showPopup( btn, extract )

		}

	} )

	btn.addEventListener( 'mouseleave', () => {

		if ( popup ) popup.style.display = 'none'

	} )

	return {
		title : getPageTitle( btn.href ),
		apply : data => {

			nameEl.innerText = data.name
			extract          = data.extract

			if ( data.image ) {

				img.src = data.image
				btn.classList.add( 'pigeon-w-has-img' )

			}

		},
	}

}

init()
