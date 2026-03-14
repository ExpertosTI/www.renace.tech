/**
 * Generates and downloads a vCard (.vcf) file
 * @param {Object} contact - Contact information
 */
function downloadVCard(contact) {
    const vcard = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${contact.lastName};${contact.firstName};;;`,
        `FN:${contact.firstName} ${contact.lastName}`,
        `ORG:${contact.organization}`,
        `TITLE:${contact.title}`,
        `TEL;TYPE=WORK,VOICE:${contact.phone}`,
        `EMAIL;TYPE=WORK,INTERNET:${contact.email}`,
        `URL:${contact.website}`,
        `REV:${new Date().toISOString()}`,
        "END:VCARD"
    ].join("\n");

    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${contact.firstName}_${contact.lastName}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {

    // Adderly Marte
    const adderlyBtn = document.getElementById('save-adderly');
    if (adderlyBtn) {
        adderlyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            downloadVCard({
                firstName: "Adderly",
                lastName: "Marte",
                organization: "RENACE Tech",
                title: "Arquitecto de Sistemas",
                email: "adderlymarte@renace.tech",
                phone: "+18494577463",
                // User requested the main website to be saved, not the deep link
                website: "https://renace.tech"
            });
        });
    }

    // Renso Cepeda
    const rensoBtn = document.getElementById('save-renso');
    if (rensoBtn) {
        rensoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            downloadVCard({
                firstName: "Renso",
                lastName: "Cepeda",
                organization: "RENACE Tech",
                title: "Co-Founder",
                email: "info@renace.tech",
                phone: "",
                website: "https://renace.tech"
            });
        });
    }
});
