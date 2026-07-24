import { ANIM, OBJ, PLAYERS } from "../../settings.js";
import { Vector3 } from "../../utils/wglm-classes.js";
import Card from "./card.js";

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

    async drawCard(cardID, cardType) {
        const { pos, rot } = PLAYERS.user;

        const [main, other] = cardID ? ["backCard", "frontCard"] : ["frontCard", "backCard"];

        const newCard = new Card(cardType, pos[main], rot[main], OBJ.card.scale);        
        this.cards[cardID] = newCard;

        const otherCard = 1 - cardID;
        await Promise.all([
            newCard.drawToHandAnim(),
            this.cards[otherCard].moveTo(pos[other]),
            this.cards[otherCard].rotateTo(rot[other])
        ]);
    }

    async returnCard(cardID){
        const otherCard = 1 - cardID;
        await Promise.all([
            this.cards[cardID].handToDrawPileAnim(),
            this.cards[otherCard].moveTo(PLAYERS.user.pos.loneCard),
            this.cards[otherCard].rotateTo(PLAYERS.user.rot.loneCard)
        ]);
        console.log("A");
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