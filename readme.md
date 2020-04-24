# BIM UI TOOLS

Provides ui tools.


## Sticky

Outtil qui permet de sticker un élément dans un parent au scroll.
 
  Le dom doit permettre d'identifier les éléments suivants :
   - (optionnel) Parent element wrapper qui défini les limites de stick haut et bas: data-sticky-parent
   - Wrapper (en fait le placeholder) : data-sticky-wrapper
   - Element : data-sticky-content
 
  Attention Sticky On Scroll ne gère rien graphiquement. Il permet juste de se brancher sur des changements d'état via
  des events.
 
  ex:
 ```javascript
import { StickyOnScrollKeys, stickMeOnScroll } from "bim-ui-tools/sticky"
 
document.querySelectorAll('[data-sticky-content]').forEach( item => {
   	stickMeOnScroll(item)
   		.on(StickyOnScrollKeys.event.onStateChange, evt =>
   		{
   	        // Ajoute le state dans le DOM.
   			evt.ev_data.sticky.wrapper.setAttribute('data-sticky-parent-state', evt.ev_data.sticky.state.parent);
   		})
   });
```
   
 
 
   Ex: de sass :
   ```scss
   [data-sticky-parent-state="screenInParent"]{
       height: var(--stickyWrapperHeight);
       [data-sticky-content]{
           position: fixed;
           top: var(--stickyContentTop);;
           bottom: auto;
       }
   }

  [data-sticky-parent-state="screenUnderParent"] {
       height: var(--stickyWrapperHeight);

       [data-sticky-content]{
           position: absolute;
           background: yellow;
           bottom:0;
           top: auto;
       }

   }
   ```
   
 
 
## Anchor

Permet d'identifier l'affichage ou non des éléments d'une ancre à l'écran.

 anchorMeOnScroll prend en paramètre la bare de navigation.


 Ex :
 ```javascript
 import { AnchorOnScrollKeys, anchorMeOnScroll } from "bim-ui-tools/anchor"
 
document.querySelectorAll('nav.anchor').forEach( item => {
  	anchorMeOnScroll(item)
  		.on( AnchorOnScrollKeys.event.onStateChange, (evt) => {
  			document.querySelectorAll('nav.anchor .on').forEach(item=> {item.classList.remove('on')})
  			evt.ev_data.anchor.anchor.classList.add("on")
  		})
  })
```
