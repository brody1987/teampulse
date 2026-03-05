const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const fetcher = (url: string) => fetch(`${API_URL}${url}`).then((res) => res.json());

export { API_URL };
