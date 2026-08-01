import PlayerAnimator from "../animations/playerAnimator.js";
import Card from "./card.js";

export const HIDDEN_CARD_TYPE = -1;

export const CARD_TYPE_IDX = {
    Ambassador: 0,
    Assassin: 1,
    Captain: 2,
    Contessa: 3,
    Duke: 4,
};

export default class Player {
    id; layout; cards; coinStack; animator;

    constructor(id, layout, coinStack, frontCard, backCard) {
        this.id = id;
        this.layout = layout;
        this.cards = [frontCard, backCard];
        this.coinStack = coinStack;
        this.animator = new PlayerAnimator(this);
    }

    update(dt) {
        this.coinStack.update(dt);
        this.cards.forEach(card => {if(card) card.update(dt); });
    }

    buy(numOfCoins = 2) {
        return this.coinStack.buy(numOfCoins);
    }

    spend(numOfCoins = 1) {
        return this.coinStack.spend(numOfCoins);
    }

    drawCard(cardID, cardType) {
        const { pos, rot } = this.#getPlayerObj();
        const [main, other] = this.#getCardName(cardID);

        const newCard = new Card(cardType, pos[main], rot[main]);        
        this.cards[cardID] = newCard;

        const otherCard = 1 - cardID;
        return this.animator.drawCard(
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
        if(!card) return;
        await this.animator.revealCard(card, camera, disappear, {
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

    setCoinCount(count) {
        this.coinStack.setCount(count);
    }

    setCards(cardTypes) {
        const { pos, rot } = this.#getPlayerObj();
        const names = ["frontCard", "backCard"];

        this.cards = names.map((name, idx) => {
            const type = cardTypes[idx];
            if(type === null || type === undefined) return null;
            return new Card(this.#cardTypeIdx(type), pos[name], rot[name]);
        });
    }

    setCardType(cardID, cardType) {
        if(!this.cards[cardID]) return;
        this.cards[cardID].typeIdx = this.#cardTypeIdx(cardType);
    }

    firstCardIndex() {
        return this.cards.findIndex(Boolean);
    }

    #getPlayerObj() {
        return this.layout;
    }

    #getCardName(cardID) {
        return cardID ? ["backCard", "frontCard"] : ["frontCard", "backCard"];
    }

    #cardTypeIdx(cardType) {
        if(cardType === HIDDEN_CARD_TYPE || cardType === null || cardType === undefined) return HIDDEN_CARD_TYPE;
        return CARD_TYPE_IDX[cardType] ?? HIDDEN_CARD_TYPE;
    }
}
