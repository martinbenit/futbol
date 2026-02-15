import { createClient } from '@supabase/supabase-js';
const s = createClient(
    'https://atyiovotcolasdwjaxch.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWlvdm90Y29sYXNkd2pheGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjAyMTgsImV4cCI6MjA4NjU5NjIxOH0.blX16-TT42hCbOAi39KP2iMEog4uP48cgRLvY905-G4'
);

const GID = '31f1870a-9fe5-431d-968f-2174e90d1e50';

async function main() {
    const { data } = await s.from('Player').select('id, name, clerkId').ilike('name', '%martin%').eq('groupId', GID);
    console.log('Martins found:', data);

    const seeded = (data || []).find(p => p.name === 'Martin' && !p.clerkId);
    if (seeded) {
        await s.from('SkillRating').delete().eq('playerId', seeded.id);
        await s.from('Player').delete().eq('id', seeded.id);
        console.log('Deleted seeded Martin:', seeded.id);
    }

    const benitez = (data || []).find(p => p.name === 'Martin Benitez');
    if (benitez) {
        await s.from('Player').update({ name: 'Martin' }).eq('id', benitez.id);
        console.log('Renamed Martin Benitez -> Martin');
    }

    const { data: final } = await s.from('Player').select('name').eq('groupId', GID).order('name');
    console.log('Final count:', (final || []).length);
}

main();
