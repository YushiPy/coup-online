import { ANIM, OBJ } from "../../settings.js";
import { Vector3, addv3 } from "../../utils/wglm-classes.js";

const CO = ANIM.coinStack;

export default class CoinStackAnimator {
    coinStack;
    constructor(coinStack) { this.coiNStack = coinStack}

    async buy(newCoin, stackPos) {
        const { levitate, buy } = CO;
                
        const levitatePos = addv3(stackPos, levitate.positionOffset);
        
        // Translation
        await newCoin.animator.positionAnimation({
            to: levitatePos,
            ...buy
        })

        // Levitation
        await newCoin.animator.positionAnimation({
            to: stackPos,
            ...levitate.animSettings
        });
    }

    async spend(spentCoin) {
        const { levitate, spend } = CO;
        const levitatePos = addv3(
            spentCoin.position, 
            levitate.positionOffset
        );

        // Levitation
        await spentCoin.animator.positionAnimation({
            to: levitatePos,
            ...levitate.animSettings
        })

        // Translation
        await spentCoin.animator.positionAnimation({
            to: OBJ.coinBank.middlePos,
            ...spend
        });
    }
}