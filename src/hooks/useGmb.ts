import { useState, useEffect } from 'react';
import API from '../services/api';

export interface GmbPost {
  _id: string;
  content: string;
  status: 'draft' | 'published';
  mediaUrl?: string;
  createdAt: string;
}

export function useGmb() {
  const [posts, setPosts] = useState<GmbPost[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    const res = await API.get('/gmb/posts');
    setPosts(res.data.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const createPost = async (data: Partial<GmbPost>) => {
    await API.post('/gmb/posts', data);
    await fetchPosts();
  };

  const deletePost = async (id: string) => {
    await API.delete(`/gmb/posts/${id}`);
    await fetchPosts();
  };

  const publishPost = async (id: string) => {
    await API.post(`/gmb/posts/${id}/publish`);
    await fetchPosts();
  };

  return { posts, loading, refresh: fetchPosts, createPost, deletePost, publishPost };
}

export default useGmb;
