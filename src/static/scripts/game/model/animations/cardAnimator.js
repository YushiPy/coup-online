import { OBJ, ANIM } from "../../settings.js";
import { Vector3, addv3 } from "../../utils/wglm-classes.js";

import { ObjectAnimator } from "../../view/animation.js";

const CA = ANIM.card;

export default class CardAnimator extends ObjectAnimator {
    card; onCommitedAnimation = false;
    constructor(card) { super(card); this.card = card; }

    async moveTo(newPos, animConfig = CA.moveTo, savePos = true) {
        if(savePos) this.card.ogPos = newPos;

        await this.positionAnimation({ to: newPos, ...animConfig });
    }

    async rotateTo(newRot, animConfig = CA.rotateTo, saveRot = true) {
        if(saveRot) this.card.ogRot = newRot;
        await this.rotationAnimation({ to: newRot, ...animConfig });
    }

    async scaleTo(newScale, animConfig = CA.scaleTo, saveScale = true) {
        if(saveScale) this.card.ogScale = newScale;
        await this.scaleAnimation({ to: newScale, ...animConfig }); 
    }

    async startHover() {
        await this.moveTo(
            addv3(this.card.ogPos, CA.hover.posOffset), 
            CA.hover.animSettings,
            false
        );
    }

    async stopHover() {
        await this.moveTo(this.card.ogPos, CA.hover.animSettings, false);
    }

    async handToDrawPileAnim() {
        this.onCommitedAnimation = true;
        await this.#levitateAnim();
        await this.returnCardAnim();
        this.onCommitedAnimation = false;
    }

    async drawPileToHandAnim() {
        const { levitateOffset } = CA.levitateAboveHand;
        this.onCommitedAnimation = true;

        await this.#drawCardAnim();

        // Going to hand (levitating first)
        const levitatePos = addv3(this.card.ogPos, levitateOffset);
        const levitateRot = new Vector3(90.0, this.card.ogRot.y, 0.0);
        await Promise.all([
            this.moveTo(levitatePos,   CA.returnDrawPile.trans, false),
            this.rotateTo(levitateRot, CA.returnDrawPile.rot, false)
        ]);

        await this.#levitateAnim(true);
        this.onCommitedAnimation = false;
    }

    async revealCardAnim(playerID) {
        const { reveal } = CA;
        const revealPos = addv3(this.card.ogPos, reveal.posOffset);
        this.onCommitedAnimation = true;

        // Player will not be affected by it's own rotation
        let   revealRot = addv3(this.card.ogRot, reveal.rotOffset);
        if(playerID == 0) revealRot = new Vector3(0.0, 180.0, 0.0);

        await this.moveTo(revealPos,   reveal.trans);
        await this.rotateTo(revealRot, reveal.rot);

        // To stop the animation, needs to call another animation function
    }

    async returnCardAnim() {
        // Only called after reveal or levitation animations
        const { drawPile } = OBJ;
        const { returnDrawPile } = CA;
        
        // Going in front of the draw Pile
        const drawScale = Vector3.subtract(this.card.ogScale, new Vector3(0.02, 0.02, 0.0));
        await Promise.all([
            this.moveTo(drawPile.cardInFront.pos,   returnDrawPile.trans),
            this.rotateTo(drawPile.cardInFront.rot, returnDrawPile.rot),
            this.scaleTo(drawScale, returnDrawPile.scale) // Avoid conflit with pile
        ])

        // Entering into draw pile
        await this.moveTo(drawPile.middlePos, returnDrawPile.drawPileTrans );
    }

    async disappearAnim() {
        await Promise.all([
            this.scaleTo(new Vector3(0.0, 0.0, 0.0), CA.disappear),
            this.rotateTo(new Vector3(720.0, 720.0, 0.0), CA.disappear)
        ]);
        this.onCommitedAnimation = false;
    }

    async returnToHandAnim() {
        // Only called after reveal or levitation anim
        await this.rotateTo(this.card.ogRot, CA.reveal.rot);
        await this.moveTo(this.card.ogPos, CA.reveal.inverseTrans);
        this.onCommitedAnimation = false;
    }

    async exchangeAnim(newPos, newRot) {
        const { levitateOffset } = CA.levitateAboveHand;
        const { translateAnim }  = CA.exchange;
        this.onCommitedAnimation = true;

        newPos = newPos.clone();
        newRot = newRot.clone();

        // First Levitation
        await this.#levitateAnim();

        // Translation
        await Promise.all([
            this.moveTo(addv3(newPos, levitateOffset), translateAnim),
            this.rotateTo(new Vector3(90.0, newRot.y, 0.0),  translateAnim)
        ]);

        this.card.ogPos = newPos;
        this.card.ogRot = newRot;

        await this.#levitateAnim(true); // Second Levitation (falling into the hand)
        this.onCommitedAnimation = false;
    }

    #drawCardAnim() {
        const { drawPile } = OBJ;
        const { returnDrawPile } = CA;

        this.card.rotation = drawPile.rotation.clone();

        const toPos = addv3(drawPile.middlePos, returnDrawPile.drawPileOffset);
        const fromScale = Vector3.subtract(this.card.ogScale, new Vector3(0.02, 0.02, 0.0));
        return Promise.all([
            this.moveTo(toPos, { from: drawPile.middlePos, ...returnDrawPile.trans }, false),
            this.scaleTo(this.card.ogScale, { from: fromScale, ...returnDrawPile.scale }, false)
        ]);
    }

    async #levitateAnim(reverse = false) {
        // Levitates the card above hand
        const { levitateAnim, levitateOffset } = CA.levitateAboveHand;
        
        const pos = reverse ? this.card.ogPos : addv3(this.card.ogPos, levitateOffset);
        const rot = reverse ? this.card.ogRot : new Vector3(90.0, this.card.ogRot.y, 0.0);

        if(reverse){
            await this.rotateTo(rot, levitateAnim.rot,   false);
            await this.moveTo(pos,   levitateAnim.trans, false);
        } else {
            await this.moveTo(pos,   levitateAnim.trans, false);
            await this.rotateTo(rot, levitateAnim.rot,   false);
        }
    }
}