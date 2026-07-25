import { PLAYERS } from "../../settings.js";
import PlayerAnimator from "../animations/playerAnimator.js";
import Card from "./card.js";

export default class Player {
    id; cards; coinStack; animator;

    constructor(id, coinStack, frontCard, backCard) {
        this.id = id;
        this.cards = [frontCard, backCard];
        this.coinStack = coinStack;
        this.animator = new PlayerAnimator(this);
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

    drawCard(cardID, cardType) {
        const { pos, rot } = this.#getPlayerObj();
        const [main, other] = this.#getCardName(cardID);

        const newCard = new Card(cardType, pos[main], rot[main]);        
        this.cards[cardID] = newCard;

        const otherCard = 1 - cardID;
        this.animator.drawCard(
            newCard, 
            { otherCard: this.cards[otherCard], pos: pos[other], rot: rot[other] }
        );
    }

    async returnCard(cardID){
        const { pos, rot } = this.#getPlayerObj();

        const otherCard = 1 - cardID;
        await this.animator.returnCard(
            this.cards[cardID],
            { otherCard: this.cards[otherCard], pos: pos.loneCard, rot: rot.loneCard }
        );

        this.cards[cardID] = null;
    }

    async revealCard(cardID, camera, disappear=true) {
        const  { pos, rot } = this.#getPlayerObj();
        const card = this.cards[cardID];
        const otherCard = 1 - cardID;
        this.animator.revealCard(card, camera, disappear, {
            otherCard: this.cards[otherCard], pos: pos.loneCard, rot: rot.loneCard
        });
    }

    exchangeCard(cardID, otherPlayer, otherPlayerCardID) {
        const newCard = otherPlayer.cards[otherPlayerCardID];
        const cardExchanged = this.cards[cardID];

        this.cards[cardID] = newCard;
        otherPlayer.cards[otherPlayerCardID] = cardExchanged;

        this.animator.exchangeCard(newCard, cardExchanged);
    }

    #getPlayerObj() {
        const playersNames = ['user', 'side', 'lSide', 'upper'];
        return PLAYERS[playersNames[this.id]];
    }

    #getCardName(cardID) {
        return cardID ? ["backCard", "frontCard"] : ["frontCard", "backCard"];
    }
}