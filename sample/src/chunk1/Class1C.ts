
export class Class1C {
    public addText(): void {
        const element = document.createElement("div");
        element.innerHTML = "Class1C ran addText";
        document.body.appendChild(element)
    }
}