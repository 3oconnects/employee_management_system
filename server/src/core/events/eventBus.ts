import EventEmitter from 'events';

class InternalEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // Set high for multiple module subscribers
    }
}

export const eventBus = new InternalEventBus();
