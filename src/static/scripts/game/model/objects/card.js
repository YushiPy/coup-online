import { OBJ } from '../../settings.js';

import RenderableObject from '../../view/renderableObject.js';
import CardAnimator from '../animations/cardAnimator.js';

export default class Card extends RenderableObject {
    typeIdx = 0;
    actions;

    #ogPos; #ogRot; #ogScale;

    #onAnimation = false;

    constructor(typeIdx, initPos, initRotation, initScale = OBJ.card.scale) {
        super("card", initPos, initRotation, initScale);
        this.animator = new CardAnimator(this);

        this.typeIdx = typeIdx;
        this.#ogPos = initPos.clone();
        this.#ogRot = initRotation.clone();
        this.#ogScale = initScale.clone();
    }

    get ogPos() { return this.#ogPos };
    set ogPos(val) { this.#ogPos = val.clone() };

    get ogRot() { return this.#ogRot };
    set ogRot(val) { this.#ogRot = val.clone() };

    get ogScale() { return this.#ogScale };
    set ogScale(val) { this.#ogScale = val.clone() };

    update(dt) {
        super.update(dt);
    }

    onMouseEnter(point) {
        if(this.animator.onCommitedAnimation) return;
        this.animator.startHover();
    }

    onMouseExit() {
        if(this.animator.onCommitedAnimation) return;
        this.animator.stopHover();    
    }
}