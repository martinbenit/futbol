'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';

interface Group {
    id: string;
    name: string;
    inviteCode: string;
    role: 'ADMIN' | 'PLAYER';
}

interface GroupContextType {
    groups: Group[];
    activeGroup: Group | null;
    setActiveGroup: (group: Group) => void;
    loading: boolean;
    refreshGroups: (switchToGroupId?: string) => Promise<void>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
    const { user, isLoaded } = useUser();
    const [groups, setGroups] = useState<Group[]>([]);
    const [activeGroup, setActiveGroup] = useState<Group | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchGroups = async (switchToGroupId?: string) => {
        if (!user) {
            setGroups([]);
            setActiveGroup(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch members associated with this clerkId across all groups
            const { data, error } = await supabase
                .from('GroupMember')
                .select(`
          role,
          groupId,
          group:Group (
            id,
            name,
            inviteCode
          )
        `)
                .eq('clerkId', user.id);

            if (error) throw error;

            const userGroups: Group[] = (data || []).map((item: any) => ({
                id: item.group.id,
                name: item.group.name,
                inviteCode: item.group.inviteCode,
                role: item.role
            }));

            setGroups(userGroups);

            // Determine which group to activate
            if (switchToGroupId) {
                // Caller explicitly wants this group to be active (e.g. after invite or creation)
                const target = userGroups.find(g => g.id === switchToGroupId);
                if (target) {
                    setActiveGroup(target);
                    localStorage.setItem('paniqueso_active_group_id', target.id);
                    return;
                }
            }

            // Persist active group selection
            const savedGroupId = localStorage.getItem('paniqueso_active_group_id');
            const found = userGroups.find(g => g.id === savedGroupId) || userGroups[0];

            if (found) {
                setActiveGroup(found);
                localStorage.setItem('paniqueso_active_group_id', found.id);
            } else {
                setActiveGroup(null);
            }
        } catch (err) {
            console.error('Error fetching groups:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isLoaded) {
            fetchGroups();
        }
    }, [user, isLoaded]);

    const handleSetActiveGroup = (group: Group) => {
        setActiveGroup(group);
        localStorage.setItem('paniqueso_active_group_id', group.id);
    };

    return (
        <GroupContext.Provider value={{
            groups,
            activeGroup,
            setActiveGroup: handleSetActiveGroup,
            loading,
            refreshGroups: fetchGroups
        }}>
            {children}
        </GroupContext.Provider>
    );
}

export function useGroups() {
    const context = useContext(GroupContext);
    if (context === undefined) {
        throw new Error('useGroups must be used within a GroupProvider');
    }
    return context;
}
