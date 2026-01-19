console.log("✅ Domain Age Finder content script loaded");

function getDomain(link) {
    const href = link.getAttribute("href");
    if (!href) return null;
    const match = href.match(/^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/\n]+)/);
    return match ? match[1] : null;
}

function calculateDomainAge(creationDateString) {
    const createdDate = new Date(creationDateString);
    const now = new Date();

    let years = now.getFullYear() - createdDate.getFullYear();
    let months = now.getMonth() - createdDate.getMonth();
    let days = now.getDate() - createdDate.getDate();

    if (days < 0) {
        months -= 1;
        days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }

    if (months < 0) {
        years -= 1;
        months += 12;
    }

    return { years, months, days };
}

async function getDomainInfo(domain) {
    try {
        const response = await fetch(`https://whois-api.fly.dev/api/whois/${domain}`);
        const data = await response.json();
        const raw = data.Raw;

        const match = raw.match(/Creation Date:\s*(\d{4}-\d{2}-\d{2})/i);
        if (!match) return null;

        return calculateDomainAge(match[1]);
    } catch (e) {
        console.error("❌ Failed WHOIS lookup:", domain, e);
        return null;
    }
}

function renderSidebar(domains) {
    const sidebar = document.createElement("div");
    sidebar.id = "sidebar";
    sidebar.style.direction = "column";

    const parent = document.querySelector(".TQc1id") || document.querySelector("#rcnt") || document.body;
    parent.appendChild(sidebar);

    const titleElement = document.createElement("div");
    titleElement.id = "titleElement";
    titleElement.innerText = "Domain Age Finder";
    sidebar.appendChild(titleElement);



    const copyButton = document.createElement("button");
    copyButton.id = "copyButton";
    copyButton.innerText = "Copy";
    sidebar.appendChild(copyButton);

    const exportButton = document.createElement("button");
    exportButton.id = "exportButton";
    exportButton.innerText = "Export";
    sidebar.appendChild(exportButton);

    const domainElementsContainer = document.createElement("div");
    domainElementsContainer.id = "domainElementsContainer";
    sidebar.appendChild(domainElementsContainer);

    const domainElements = [];

    domains.forEach(domain => {
        const div = document.createElement("div");
        div.id = "domainElement";
        div.innerText = domain;
        domainElementsContainer.appendChild(div);
        domainElements.push(div);
    });

    domainElements.forEach(el => {
        el.addEventListener("mouseover", () => {
            el.style.opacity = "0.9";
            el.style.cursor = "pointer";
        });
        el.addEventListener("mouseout", () => {
            el.style.opacity = "1.2";
        });
    });

    copyButton.addEventListener("click", () => {
        const list = [...document.querySelectorAll("#domainElementsContainer div")].map(e => e.innerText);
        const text = list.join("\n");
        navigator.clipboard.writeText(text);
        copyButton.innerText = "Copied";
        copyButton.style.backgroundColor = "rgb(208, 133, 14)";
        copyButton.style.color = "white";
        setTimeout(() => {
            copyButton.innerText = "Copy";
            copyButton.style.backgroundColor = "rgb(227, 227, 147)";
            copyButton.style.color = "rgb(77, 71, 66)";
        }, 2000);
    });

    exportButton.addEventListener("click", () => {
        const rows = [...document.querySelectorAll("#domainElementsContainer div")].map(e => e.innerText);
        let csv = "Domain Name, Domain Age \r";
        rows.forEach(row => {
            const [domain, age] = row.split(" (");
            if (age) {
                const formatted = age
                    .replace(/[,)]/g, "")
                    .replace(/Y/gi, " Years")
                    .replace(/M/gi, " Months")
                    .replace(/D/gi, " Days");
                csv += `${domain},${formatted}\r`;
            }
        });
        const a = document.createElement("a");
        a.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
        a.download = "domains_with_age.csv";
        a.click();
        exportButton.innerText = "Exported";
        exportButton.style.backgroundColor = "rgb(208, 133, 14)";
        exportButton.style.color = "white";
        setTimeout(() => {
            exportButton.innerText = "Export";
            exportButton.style.backgroundColor = "rgb(227, 210, 147)";
            exportButton.style.color = "rgb(77, 71, 66)";
        }, 2000);
    });

    return domainElements;
}

function waitForGoogleResults() {
    return new Promise(resolve => {
        const observer = new MutationObserver(() => {
            const results = document.querySelectorAll('a.zReHs[href^="http"]');
            if (results.length > 0) {
                console.log(`✅ Found ${results.length} Google result links`);
                observer.disconnect();
                resolve(results);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

async function enrichDomainsFast(domainElements) {
    await Promise.all(
        domainElements.map(async (element) => {
            const originalDomain = element.innerText.replace(/^www\./, '').replace(/\/$/, '');
            element.innerText = `${originalDomain} (loading...)`;

            const age = await getDomainInfo(originalDomain);
            if (age) {
                let label = `${originalDomain} (${age.years}Y`;
                if (age.months > 0) label += `, ${age.months}M`;
                if (age.days > 0) label += `, ${age.days}D`;
                label += ")";
                element.innerText = label;

                if (age.years < 4) {
                    element.style.backgroundColor = "#4CAF50";
                }
            } else {
                element.innerText = `${originalDomain} (error)`;
            }
        })
    );
}

async function initializeExtension() {
    console.log("👀 Waiting for search results...");
    const links = await waitForGoogleResults();

    const domains = [];
    links.forEach(link => {
        const domain = getDomain(link);
        if (!domain) return;
        const cleanDomain = domain.toLowerCase().replace(/^www\./, '').replace(/\/$/, '');
        const blocklist = ["googleusercontent.com", "webcache.googleusercontent.com", "amzn"];
        if (blocklist.some(b => cleanDomain.includes(b))) return;
        if (!domains.includes(cleanDomain)) domains.push(cleanDomain);
    });

    const elements = renderSidebar(domains);
    await enrichDomainsFast(elements);
}

initializeExtension();
