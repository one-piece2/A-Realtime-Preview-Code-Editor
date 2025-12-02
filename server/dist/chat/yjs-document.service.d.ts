import * as Y from 'yjs';
export declare class YjsDocumentService {
    private readonly logger;
    private readonly rooms;
    registerClient(roomId: string, clientId: string): Y.Doc;
    unregisterClient(roomId: string, clientId: string): void;
    applyUpdate(roomId: string, update: Uint8Array): void;
    getStateVector(roomId: string): Uint8Array;
    getStateAsUpdate(roomId: string, stateVector?: Uint8Array): Uint8Array;
    initDocIfEmpty(roomId: string, initialCode: string): void;
    private ensureRoom;
}
