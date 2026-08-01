import { ANIM } from "../../settings.js";

export default class PlayerAnimator {
    player;

    constructor(player) {this.player = player; }

    async drawCard(newCard, { otherCard, pos, rot } = {}) {
        let animations = [newCard.animator.drawPileToHandAnim()];

        if(otherCard) animations.push(Promise.all([
            otherCard.animator.moveTo(pos),
            otherCard.animator.rotateTo(rot)
        ]));

        await Promise.all(animations);
    }

    async returnCard(returnedCard, { otherCard, pos, rot} = {}) {
        let animations = [returnedCard.animator.handToDrawPileAnim()];
        
        if(otherCard) animations.push(Promise.all([
            otherCard.animator.moveTo(pos),
            otherCard.animator.rotateTo(rot)
        ]));

        await Promise.all(animations);
    }

    async revealCard(card, camera, disappear, { otherCard, pos, rot } = {}) {
        const { reveal } = ANIM.card;

        // User animation doesn't use camera
        if(this.player.id != 0) camera.startLooking(card, reveal.cameraZoom);
        await card.animator.revealCardAnim(this.player.id);

        if(disappear && otherCard) {
            otherCard.animator.moveTo(pos);
            otherCard.animator.rotateTo(rot);
        }
        
        await new Promise((resolve) => {
            setTimeout(resolve, reveal.revealedTime * reveal.cameraStarePerc * 1000);
        });

        // Camera may end animation before card
        if(this.player.id != 0) camera.stopLooking();

        await new Promise((resolve) => {
            setTimeout(resolve, reveal.revealedTime * (1-reveal.cameraStarePerc) * 1000);
        })

        if(disappear) await card.animator.disappearAnim();
        else await card.animator.returnCardAnim();
    }

    async exchangeCard(newCard, cardExchanged) {
        await Promise.all([
            newCard.animator.exchangeAnim(cardExchanged.position, cardExchanged.rotation),
            cardExchanged.animator.exchangeAnim(newCard.position, newCard.rotation),
        ]);
    }
}
