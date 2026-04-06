/**
 * ChatSkeleton
 * Skeleton loading que replica o layout do AppChat
 */

import React from 'react';
import { Skeleton } from '@mui/material';

const ChatSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col h-full">
            {/* Header Skeleton */}
            <div className="p-4 md:p-6 mb-2 md:mb-6 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Skeleton variant="circular" width={40} height={40} />
                        <div>
                            <Skeleton variant="text" width={280} height={32} />
                            <Skeleton variant="text" width={200} height={20} />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Skeleton variant="rounded" width={120} height={32} />
                        <Skeleton variant="rounded" width={100} height={36} />
                    </div>
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex h-[85vh] bg-gray-50 overflow-hidden rounded-lg">
                {/* Sidebar Skeleton */}
                <div className="hidden sm:flex flex-col w-80 shrink-0 bg-gradient-to-b from-indigo-900 to-purple-800 p-4">
                    {/* Search bar */}
                    <Skeleton variant="rounded" width="100%" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                    
                    {/* Contact list */}
                    <div className="mt-4 space-y-3">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-2">
                                <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                                <div className="flex-1">
                                    <Skeleton variant="text" width="70%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                                    <Skeleton variant="text" width="50%" height={16} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area Skeleton */}
                <div className="flex-1 flex flex-col bg-white min-w-0">
                    {/* Chat Header */}
                    <div className="flex items-center gap-3 p-4 border-b border-gray-200">
                        <Skeleton variant="circular" width={40} height={40} />
                        <div className="flex-1">
                            <Skeleton variant="text" width={150} height={20} />
                            <Skeleton variant="text" width={100} height={16} />
                        </div>
                        <Skeleton variant="rounded" width={80} height={32} />
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-4 space-y-4 overflow-hidden">
                        {/* Incoming message */}
                        <div className="flex gap-3">
                            <Skeleton variant="circular" width={32} height={32} />
                            <div className="max-w-[70%]">
                                <Skeleton variant="rounded" width={200} height={60} sx={{ borderRadius: '12px' }} />
                            </div>
                        </div>

                        {/* Outgoing message */}
                        <div className="flex gap-3 justify-end">
                            <div className="max-w-[70%]">
                                <Skeleton variant="rounded" width={180} height={50} sx={{ borderRadius: '12px', bgcolor: 'primary.100' }} />
                            </div>
                        </div>

                        {/* Incoming message */}
                        <div className="flex gap-3">
                            <Skeleton variant="circular" width={32} height={32} />
                            <div className="max-w-[70%]">
                                <Skeleton variant="rounded" width={250} height={80} sx={{ borderRadius: '12px' }} />
                            </div>
                        </div>

                        {/* Outgoing message */}
                        <div className="flex gap-3 justify-end">
                            <div className="max-w-[70%]">
                                <Skeleton variant="rounded" width={160} height={40} sx={{ borderRadius: '12px', bgcolor: 'primary.100' }} />
                            </div>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-gray-200 flex items-end gap-2">
                        <Skeleton variant="circular" width={40} height={40} />
                        <Skeleton variant="rounded" width="100%" height={44} sx={{ flex: 1 }} />
                        <Skeleton variant="circular" width={40} height={40} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatSkeleton;
