import { createPathObfuscator } from "./pathObfuscator";

export class Sigmo {
    private apiUrl: string;
    private apiKey: string;
    private userId?: string;
    private anonymous?: boolean;
    private groupId?: string;

    constructor(props: {
        apiUrl: string,
        apiKey: string,
    }) {
        this.apiUrl = props.apiUrl;
        this.apiKey = props.apiKey;
    }

    track<Props extends Record<string, string | number | undefined>>(event: string, props?: Props) {
        const data = {
            sdk: 'sigmo@0.1.0',
            event,
            props,
            user_id: this.userId,
            anonymous: this.anonymous,
            group_id: this.groupId,
            user_agent: navigator.userAgent,
        };
        let _id = this.send(this.apiUrl, data);
        return (props: Props) => {
            _id.then((id) => {
                _id = this.send(this.apiUrl, { ...data, id, props });
            });
        };
    }

    setUser(id?: string, anonymous = false) {
        this.userId = id;
        this.anonymous = id ? anonymous : undefined;
    }

    setGroup(id?: string) {
        this.groupId = id;
    }

    private async send(url: string, data: Record<string, any>): Promise<number | null> {
        const res = await fetch(url, {
            method: "POST",
            keepalive: true,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            const { id } = await res.json() as { id: number };
            return id;
        }
        return null;
    }
}

type PageViewProps = {
    path: string;
    duration: number;
    referrer?: string;
}

export function trackPageView(analytics: Sigmo, obfuscatedPaths?: string[]) {
    if (typeof window === "undefined") {
        return;
    }

    const event = "[view page]";
    let props: PageViewProps;
    let visibilityStart = Date.now();
    let update: ((props: PageViewProps) => void) | undefined;
    let lastSend: number | undefined;

    const obfuscatePath = createPathObfuscator(obfuscatedPaths || []);

    initPage();
    send();

    const destroyPageChange = onPageChange(() => {
        send();
        initPage();
    });

    const destroyVisibilityChange = onVisibilityChange((visible) => {
        if (visible) {
            visibilityStart = Date.now();
        } else {
            send();
        }
    });

    function initPage() {
        props = {
            path: obfuscatePath(location.pathname),
            duration: 0,
        };
        try {
            const url = new URL(document.referrer);
            props.referrer = url.host !== location.host ? url.host : undefined;
        } catch {
            props.referrer = undefined;
        }
        visibilityStart = Date.now();
        lastSend = undefined;
        update = undefined;
    }

    function send() {
        props.duration += Date.now() - visibilityStart;
        visibilityStart = Date.now();
        if (update) {
            if (lastSend && Date.now() - lastSend < 1000) {
                return;
            }
            update(props);
        } else {
            update = analytics.track(event, props);
        }
    }

    return () => {
        destroyPageChange();
        destroyVisibilityChange();
    };
}

function onVisibilityChange(cb: (visible: boolean) => void) {
    function handleVisibilityChange() {
        cb(document.visibilityState === "visible");
    }
    function handlePageHide() {
        cb(false);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pagehide", handlePageHide);
    };
}

function onPageChange(cb: () => void) {
    let path = location.pathname;
    const interval = setInterval(() => {
        const currentPath = location.pathname;
        if (currentPath !== path) {
            path = currentPath;
            cb();
        }
    }, 100);
    return () => clearInterval(interval);
}
