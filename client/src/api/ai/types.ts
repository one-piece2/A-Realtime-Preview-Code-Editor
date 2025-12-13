export interface Message{
    role:string,
    content:string
}

export interface Completion{
    prefix:string,
    suffix:string,
    language?:string,
    filename?:string
}