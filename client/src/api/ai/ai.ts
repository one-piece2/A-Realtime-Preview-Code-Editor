
import { api } from '@/utils/axios';
import type { Message, Completion } from '@/api/ai/types';

export async function chatStream(messages: Message[], context: string) {
    const response = await api.post('/ai/chat/stream', { messages, context });
    return response.data;
}
export async function getCompletion(completion:Completion){
       const response = await api.post('/ai/completion',completion);
       return response.data;
}

export const aiApi = {
    chatStream,
    getCompletion
};

