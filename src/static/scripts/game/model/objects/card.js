import { ANIM, OBJ } from '../../settings.js';
import { Vector3 } from '../../utils/wglm-classes.js';
import { easeInOutCurve, easeOutBackCurve, easeOutCircCurve, easeOutQuintCurve, linearCurve } from '../../utils/wlgm-animation-curves.js';

import RenderableObject from '../../view/renderableObject.js';

export default class Card extends RenderableObject {
    typeIdx = 0;
    ogRot; ogScale

    #ogPos;

    #onAnimation = false;

    constructor(typeIdx, initPos, initRotation, initScale = OBJ.card.scale) {
        super("card", initPos, initRotation, initScale);
        this.typeIdx = typeIdx;
        this.ogPos = initPos.clone();
        this.ogRot = initRotation.clone();
        this.ogScale = initScale.clone();
    }

    get ogPos() { return this.#ogPos };
    set ogPos(val) { this.#ogPos = val };

    update(dt) {
        super.update(dt);
    }

    onMouseEnter(point) {
        if(this.#onAnimation) return;

        this.animator.positionAnimation({
            to: Vector3.add(this.position, ANIM.card.hover.positionOffset),
            ...ANIM.card.hover.animSettings
        })
    }

    onMouseExit() {
        if(this.#onAnimation) return;

        this.animator.positionAnimation({to: this.ogPos, ...ANIM.card.hover.animSettings});
    }

    // Animations
    async moveTo(newPos) {
        this.#ogPos = newPos.clone();
        await this.animator.positionAnimation({
            to: this.#ogPos,
            animTime: 1.0,
            animCurve: easeOutBackCurve
        });
    }

    async rotateTo(newRot) {
        this.ogRot = newRot.clone();
        await this.animator.rotationAnimation({
            to: this.ogRot,
            animTime: 1.0,
            animCurve: easeOutBackCurve
        });
    }

    async handToDrawPileAnim() {
        await this.#levitateAnim();

        await this.returnCardAnim();
    }

    async drawToHandAnim() {
        const { drawPile } = OBJ;
        const { levitateOffset } = ANIM.card.levitateAboveHand;
        await this.#drawCardAnim();

        await Promise.all([
            this.animator.positionAnimation({
                to: Vector3.add(this.ogPos, levitateOffset),
                ...ANIM.card.returnDrawPile.translation
            }),
            this.animator.rotationAnimation({
                to: new Vector3(90.0, this.ogRot.y, 0.0),
                ...ANIM.card.returnDrawPile.rotation
            })
        ]);

        this.#levitateAnim({ reverse: true, handPos: this.ogPos, handRot: this.ogRot });

        this.#onAnimation = false;
    }

    async revealCardAnim(playerID) {
        const { reveal } = ANIM.card;
        this.#onAnimation = true;

        const revealPos = Vector3.add(this.ogPos, reveal.card.posOffset);
        let revealRot = Vector3.add(this.ogRot, reveal.card.rotOffset);
        // Player will not be affected by it's own rotation
        if(playerID == 0) revealRot = new Vector3(0.0, 180.0, 0.0);

        await this.animator.positionAnimation({to: revealPos, ...reveal.card.translation});
        await this.animator.rotationAnimation({to: revealRot, ...reveal.card.rotation});

        // To stop the animation, needs to call another animation function
    }

    async returnCardAnim() {
        // Only called after revealCardAnim()
        const { drawPile } = OBJ;
        const { returnDrawPile } = ANIM.card;
        
        await Promise.all([ // Going in front of the draw Pile
            this.animator.positionAnimation({
                to: Vector3.add(drawPile.middlePos, returnDrawPile.drawPileOffset),
                ...returnDrawPile.translation
            }),
            this.animator.rotationAnimation({
                to: new Vector3(90, drawPile.rotation.y, 0.0),
                ...returnDrawPile.rotation
            }),
            this.animator.scaleAnimation({ // To avoid conflit with draw pile
                to: Vector3.subtract(this.ogScale, new Vector3(0.02, 0.02, 0.0)),
                ...returnDrawPile.scale
            })
        ]);

        await this.animator.positionAnimation({ // Entering into draw pile
            to: drawPile.middlePos, ...returnDrawPile.drawPileTranslation
        });

        this.#onAnimation = false;
    }

    async disappearAnim() {
        await Promise.all([
            this.animator.scaleAnimation({
                to: new Vector3(0.0, 0.0, 0.0),
                animTime: 1.0,
                animCurve: linearCurve
            }),
            this.animator.rotationAnimation({
                to: new Vector3(720.0, 720.0, 0.0),
                animTime: 1.0,
                animCurve: linearCurve
            })
        ]);
    }

    async stopRevealAnim() {
        // Only called after reveal or levitation anim
        // Returning to hand
        const { reveal } = ANIM.card;
        this.#onAnimation = true;

        await this.animator.rotationAnimation({to: this.ogRot, ...reveal.card.rotation});
        await this.animator.positionAnimation({to: this.ogPos, ...reveal.card.inverseTranslation});

        this.#onAnimation = false;
    }

    async exchangeAnim(otherCard) {
        const { levitateOffset } = ANIM.card.levitateAboveHand;
        const { translateAnim }  = ANIM.card.exchange;

        this.#onAnimation = true;
        const newPos = otherCard.ogPos.clone();
        const newRot = otherCard.ogRot.clone();

        // First Levitation
        await this.#levitateAnim();

        // Translation
        await Promise.all([
            this.animator.positionAnimation({
                to: Vector3.add(newPos, levitateOffset),
                ...translateAnim
            }),
            this.animator.rotationAnimation({
                to: new Vector3(90, newRot.y, 0),
                ...translateAnim
            })
        ]);

        // Second Levitation (falling into the hand)
        this.#levitateAnim({reverse: true, handPos: newPos, handRot: newRot});

        this.ogPos = newPos;
        this.ogRot = newRot;
        this.#onAnimation = false;
    }

    #drawCardAnim() {
        const { drawPile } = OBJ;
        const { returnDrawPile } = ANIM.card;

        this.rotation = drawPile.rotation.clone();
        return Promise.all([
            this.animator.positionAnimation({
                from: drawPile.middlePos,
                to: Vector3.add(drawPile.middlePos, returnDrawPile.drawPileOffset), 
                ...returnDrawPile.translation,
            }),
            this.animator.scaleAnimation({
                from: Vector3.subtract(this.ogScale, new Vector3(0.02, 0.02, 0.0)),
                to: this.ogScale,
                ...returnDrawPile.scale
            })
        ]);
    }

    #levitateAnim(config = {}) {
        // Levitates the card above hand
        const { levitateAnim, levitateOffset } = ANIM.card.levitateAboveHand;
        const { reverse = false, handPos = null, handRot = null } = config;
        this.#onAnimation = true;

        let pos, rot;
        if(reverse) {
            pos = handPos; rot = handRot;
        } else {
            pos = Vector3.add(this.ogPos, levitateOffset);
            rot = new Vector3(90, this.rotation.y, 0.0);
        }

        return Promise.all([
            this.animator.positionAnimation({ to: pos, ...levitateAnim }),
            this.animator.rotationAnimation({ to: rot, ...levitateAnim})
        ]);
    }
}