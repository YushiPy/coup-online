import { HIDDEN_CARD_TYPE } from "./objects/player.js";

export default class MatchAnimationController {
    #lastEvent = null;
    #queue = Promise.resolve();
    #previousState = null;
    #playerSlots = new Map();

    handleState(state, scene) {
        if(!state?.turnOrder?.length || !state.localPlayerId) return;

        scene.ensurePlayerCount(state.turnOrder.length);
        this.#updatePlayerSlots(state, scene);
        if(!this.#previousState || !state.lastEvent) {
            scene.syncToState(state, this.#playerSlots);
            this.#previousState = this.#cloneState(state);
            return;
        }

        if(state.lastEvent === this.#lastEvent) {
            this.#previousState = this.#cloneState(state);
            return;
        }

        const fromState = this.#previousState;
        const toState = this.#cloneState(state);
        const playerSlots = new Map(this.#playerSlots);
        this.#previousState = toState;
        this.#lastEvent = state.lastEvent;
        this.#queue = this.#queue
            .then(() => this.#animateEvent(state.lastEvent, fromState, state, scene, playerSlots))
            .then(() => scene.syncToState(state, playerSlots))
            .catch((err) => {
                console.error("Failed to animate match event", err);
                scene.syncToState(state, playerSlots);
            });
    }

    #updatePlayerSlots(state, scene) {
        const order = this.#localFirstOrder(state);
        this.#playerSlots = new Map();
        order.slice(0, scene.players.length).forEach((playerId, idx) => {
            this.#playerSlots.set(playerId, idx);
        });
    }

    #localFirstOrder(state) {
        const order = [...state.turnOrder];
        const localIdx = order.indexOf(state.localPlayerId);
        if(localIdx <= 0) return order;
        return [...order.slice(localIdx), ...order.slice(0, localIdx)];
    }

    async #animateEvent(event, fromState, toState, scene, playerSlots) {
        const animations = [];

        for(const [playerId, player] of Object.entries(toState.players || {})) {
            const previousCoins = fromState.players?.[playerId]?.coins;
            if(previousCoins === undefined) continue;
            const diff = player.coins - previousCoins;
            if(diff > 0) animations.push(scene.animatePlayerCoins(playerId, diff, playerSlots));
            if(diff < 0) animations.push(scene.animatePlayerSpend(playerId, -diff, playerSlots));
        }

        const revealedLoss = event.reveal?.player_id && event.reveal?.lost_card;
        if(event.reveal) {
            animations.push(scene.animateReveal(
                event.reveal.player_id,
                event.reveal.card || event.reveal.lost_card || event.reveal.declared_card,
                Boolean(event.reveal.lost_card),
                playerSlots
            ));
        }

        const loserId = event.loser_id || event.target_id || event.player_id;
        if(event.lost_card && loserId && !(revealedLoss && event.reveal.player_id === loserId && event.reveal.lost_card === event.lost_card)) {
            animations.push(scene.animateReveal(loserId, event.lost_card, true, playerSlots));
        }

        if(event.event === "waiting_card_loss" && event.cards) {
            const slot = playerSlots.get(event.player_id);
            if(slot !== undefined && event.player_id === toState.localPlayerId) {
                scene.players[slot].setCards(event.cards);
            }
        }

        if(event.event === "waiting_exchange" && event.new_cards?.length) {
            const slot = playerSlots.get(event.player_id);
            if(slot !== undefined) {
                const player = scene.players[slot];
                const firstEmpty = player.cards.findIndex(card => !card);
                if(firstEmpty !== -1) animations.push(player.drawCard(firstEmpty, this.#visibleCardType(event.player_id, event.new_cards[0], toState)));
            }
        }

        await Promise.all(animations);
    }

    #visibleCardType(playerId, cardType, state) {
        return playerId === state.localPlayerId ? cardType : HIDDEN_CARD_TYPE;
    }

    #cloneState(state) {
        return {
            localPlayerId: state.localPlayerId,
            turnOrder: [...(state.turnOrder || [])],
            players: Object.fromEntries(
                Object.entries(state.players || {}).map(([id, player]) => [
                    id,
                    {
                        coins: player.coins,
                        alive: player.alive,
                        numHiddenCards: player.numHiddenCards,
                        revealedCards: [...(player.revealedCards || [])],
                    },
                ])
            ),
        };
    }
}
