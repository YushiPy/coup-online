import { ANIM, PLAYERS } from "../../settings.js";
import { Vector3 } from "../../utils/wglm-classes.js";

export default class Player {
    id; cards; coinStack;

    constructor(id, coinStack, frontCard, backCard) {
        this.id = id;
        this.cards = [frontCard, backCard];
        this.coinStack = coinStack;
    }

    update(dt) {
        this.coinStack.update(dt);
        this.cards.forEach(card => {if(card) card.update(dt); });
    }

    buy(numOfCoins = 2) {
        this.coinStack.buy(numOfCoins);
    }

    spend(numOfCoins = 1) {
        this.coinStack.spend(numOfCoins);
    }

    async returnCard(cardID){
        let otherCard, multPosRot;
        if(cardID) {
            otherCard = 0;
            multPosRot = 1;
        } else {
            otherCard = 1;
            multPosRot = -1;
        }

        await Promise.all([
            this.cards[cardID].handToDrawPileAnim(),
            this.cards[otherCard].moveTo(PLAYERS.user.pos.loneCard),
            this.cards[otherCard].rotateTo(PLAYERS.user.rot.loneCard)
        ]);

        this.cards[cardID] = null;
    }

    async revealCard(cardID, camera, disappear=true) {
        const { reveal } = ANIM.card;
        const card = this.cards[cardID];
        
        // User animation doesn't use camera
        if(this.id != 0) camera.startLooking(card, reveal.cameraZoom);
        card.revealCardAnim(this.id);
        
        await new Promise((resolve) => {
            setTimeout(resolve, reveal.totalAnimTime * reveal.cameraTime * 1000);
        });
        // Camera may end animation before card
        if(this.id != 0) camera.stopLooking();

        await new Promise((resolve) => {
            setTimeout(resolve, reveal.totalAnimTime * (1-reveal.cameraTime) * 1000);
        })

        if(disappear) await card.disappearAnim();
        else card.returnCardAnim();
    }

    exchangeCard(cardID, otherPlayer, otherPlayerCardID) {
        const newCard = otherPlayer.cards[otherPlayerCardID];
        const cardExchanged = this.cards[cardID];

        this.cards[cardID] = newCard;
        otherPlayer.cards[otherPlayerCardID] = cardExchanged;

        newCard.exchangeAnim(cardExchanged);
        cardExchanged.exchangeAnim(newCard);
    }


}