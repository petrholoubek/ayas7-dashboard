const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 7777 }, () => {
    console.log('AYAS-7 chip-core běží na ws://localhost:7777');
});

class StateEngine {
    constructor() {
        this.state = {
            systemMode: 'IDLE',
            yieldRate: 0,
            nodesOnline: 0,
            lastUpdate: new Date().toISOString()
        };
        this.clients = new Set();
    }

    getState() {
        return this.state;
    }

    updateState(patch) {
        this.state = { ...this.state, ...patch, lastUpdate: new Date().toISOString() };
        this.broadcastState();
    }

    addClient(ws) {
        this.clients.add(ws);
        ws.send(JSON.stringify({ type: 'state', data: this.state }));
    }

    removeClient(ws) {
        this.clients.delete(ws);
    }

    broadcastState() {
        const msg = JSON.stringify({ type:'state', data:this.state });
        for (const c of this.clients) if (c.readyState === 1) c.send(msg);
    }
}

const core = new StateEngine();

wss.on('connection', ws => {
    console.log('Klient připojen');
    core.addClient(ws);

    ws.on('message', msg => {
        try{
            const data = JSON.parse(msg);
            if(data.type === 'update') core.updateState(data.data);
        }catch(e){
            console.log('Chyba zprávy', e.message);
        }
    });

    ws.on('close',()=>core.removeClient(ws));
});
