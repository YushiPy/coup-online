import { Vector3 } from "../../utils/wglm-classes.js";
import { OBJ, ANIM } from "../../settings.js";

import Coin from "./coin.js";
import CoinStackAnimator from "../animations/coinStackAnimator.js";

export default class CoinStack {
    position; animator;
    coins; 

    #spentCoins;
    #heightPadding;

    constructor(position, coinsCount, heightPadding) {
        this.position = position;
        this.coins = []; this.#spentCoins = new Set();
        this.#heightPadding = heightPadding;

        this.animator = new CoinStackAnimator

        for(let i=0; i<coinsCount; i++) {
            this.coins.push(this.#createCoin(position, i));
        }
    }

    update(dt) {
        this.coins.forEach(coin => coin.update(dt));
        this.#spentCoins.forEach(coin => coin.update(dt));
    }

    buy(numOfCoins) {
        // Assumes caller checks length
        const delayTime = ANIM.coinStack.delayBetweenCoins * 1000;
        for(let i=0; i<numOfCoins; i++) {
            setTimeout(() => {
                this.#buyCoin();
            }, delayTime * i);
        };
    }

    spend(numOfCoins) {
        if(numOfCoins > this.coins.length) numOfCoins = this.coins.length;
        const delayTime = ANIM.coinStack.delayBetweenCoins * 1000;
        for(let i=0; i<numOfCoins; i++) {
            setTimeout(() => {
                this.#spendCoin();
            }, delayTime * i)
        }
    }

    getAllCoins() {
        return [...this.coins, ...this.#spentCoins];
    }

    #createCoin(position, index) {
        const pos = this.#getCoinPosition(position, index);
        return new Coin(pos, OBJ.coin.rotation, OBJ.coin.scale);
    }

    #getCoinPosition(position, index) {
        const padding = new Vector3(0, index * this.#heightPadding, 0);
        return Vector3.add(position, padding);
    }

    #buyCoin() {
        const newCoin = this.#createCoin(OBJ.coinBank.middlePos, 0);
        this.coins.push(newCoin);

        const stackPos = this.#getCoinPosition(this.position, this.coins.length-1);
        this.animator.buy(newCoin, stackPos);
    }

    async #spendCoin() {
        const spentCoin = this.coins.pop();
        this.#spentCoins.add(spentCoin);

        this.animator.spend(spentCoin);
    }
}