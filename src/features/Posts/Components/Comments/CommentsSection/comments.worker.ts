import debounce from 'lodash.debounce';
import { relayPool } from 'nostr-tools'
import { Nullable } from 'remirror';
import { CONSTS } from 'src/utils';
import { Comment } from '../types';


const pool = relayPool();



export function connect() {
    CONSTS.DEFAULT_RELAYS.forEach(url => {
        pool.addRelay(url, { read: true, write: true })
    })
    pool.onNotice((notice: string, relay: any) => {
        console.log(`${relay.url} says: ${notice}`)
    })
};

let events: Record<string, Required<NostrEvent>> = {};

export function sub(filter: string, cb: (data: Comment[]) => void) {

    const reconstructTree = debounce(async () => {
        const newComments = await constructTree();
        cb(newComments)
    }, 1000)


    let sub = pool.sub({
        filter: {
            "#r": [filter]
        },
        cb: async (event: Required<NostrEvent>) => {
            //Got a new event 
            if (!event.id) return;

            if (event.id in events) return;

            events[event.id] = event
            reconstructTree()

            document.dispatchEvent(
                new CustomEvent('nostr-event', {
                    detail: event
                })
            )
        }
    });

    return () => {
        sub.unsub();
        events = {};
    };
}

async function signEvent(event: any) {
    const res = await fetch(CONSTS.apiEndpoint + '/nostr-sign-event', {
        method: "post",
        body: JSON.stringify({ event }),
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
    });
    const data = await res.json()
    return data.event;
}

async function confirmPublishingEvent(event: any) {
    const res = await fetch(CONSTS.apiEndpoint + '/nostr-confirm-event', {
        method: "post",
        body: JSON.stringify({ event }),
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
    });
    const data = await res.json()
    return data.event;
}


async function getCommentsExtraData(ids: string[]) {
    const res = await fetch(CONSTS.apiEndpoint + '/nostr-events-extra-data', {
        method: "post",
        body: JSON.stringify({ ids }),
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
    });

    type EventExtraData = {
        id: number
        nostr_id: string
        votes_count: number
        user: {
            id: number,
            avatar: string,
            name: string,
        }
    }

    const data = await res.json() as EventExtraData[];

    const map = new Map<string, EventExtraData>()
    data.forEach(item => {
        map.set(item.nostr_id, item)
    });
    return map;
}



export async function post({ content, filter, parentId }: {
    content: string,
    filter: string,
    parentId?: string
}) {

    const tags = [];
    tags.push(['r', filter]);
    if (parentId)
        tags.push(['e', `${parentId} ${CONSTS.DEFAULT_RELAYS[0]} reply`])

    let event: NostrEvent;
    try {
        event = await signEvent({
            // pubkey: globalKeys.pubkey,
            // created_at: Math.round(Date.now() / 1000),
            kind: 1,
            tags,
            content,
        }) as NostrEvent;
    } catch (error) {
        alert("Couldn't sign the object successfully...")
        return;
    }




    return new Promise<void>((resolve, reject) => {

        pool.publish(event, (status: number, relay: string) => {
            switch (status) {
                case -1:
                    console.log(`failed to send ${JSON.stringify(event)} to ${relay}`)
                    break
                case 1:
                    clearTimeout(publishTimeout)
                    console.log(`event ${event.id?.slice(0, 5)}… published to ${relay}.`)
                    break
            }
        });

        const onEventFetched = (e: CustomEvent<NostrEvent>) => {
            if (e.detail.id === event.id) {
                document.removeEventListener<any>('nostr-event', onEventFetched);
                confirmPublishingEvent(event)
                resolve();
            }
        }
        document.addEventListener<any>('nostr-event', onEventFetched);

        const publishTimeout = setTimeout(() => {
            document.removeEventListener<any>('nostr-event', onEventFetched);
            reject("Failed to publish to any relay...");
        }, 5000)


    })
}

function extractParentId(event: NostrEvent): Nullable<string> {

    for (const [identifier, value] of event.tags) {
        if (identifier === 'e') {
            const [eventId, , marker] = value.split(' ');
            if (marker === 'reply') return eventId;
        }
    }
    return null;
}

export async function constructTree() {
    // This function is responsible for transforming the object shaped events into a tree of comments
    // ----------------------------------------------------------------------------------------------

    // Sort them chronologically from oldest to newest
    let sortedEvenets = Object.values(events).sort((a, b) => a.created_at - b.created_at);


    // Extract the pubkeys used
    const pubkeysSet = new Set<string>();
    sortedEvenets.forEach(e => pubkeysSet.add(e.pubkey));

    // Make a request to api to get comments extra data
    const commentsExtraData = await getCommentsExtraData(Object.keys(events));

    let eventsTree: Record<string, Comment> = {}
    // If event is a reply, connect it to parent
    sortedEvenets.forEach(e => {
        const parentId = extractParentId(e);
        const extraData = commentsExtraData.get(e.id);

        // if no extra data is here then that means this event wasn't done from our platform
        if (!extraData) return;

        if (parentId) {
            eventsTree[parentId]?.replies.push({
                id: extraData.id,
                nostr_id: e.id,
                body: e.content,
                created_at: e.created_at * 1000,
                pubkey: e.pubkey,
                author: extraData.user,
                replies: [],
                votes_count: extraData.votes_count
            });
        } else {
            eventsTree[e.id] = ({
                id: extraData.id,
                nostr_id: e.id,
                body: e.content,
                created_at: e.created_at * 1000,
                pubkey: e.pubkey,
                author: extraData.user,
                replies: [],
                votes_count: extraData.votes_count

            });
        }
    })

    // Run the censoring service
    // (nothing for now -:-)

    // Turn the top roots replies into a sorted array
    const sortedTree = Object.values(eventsTree).sort((a, b) => b.created_at - a.created_at)
    // Publish the new tree.
    return sortedTree;

}