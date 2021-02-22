export class ClassB {
    public static getStringSuffix(): string {
        return "!!!";
    }

    public unusedMethod(): string {
        require("./chunk2/Class2D").Class2D.someMethod();
        return "unusedMethod text";
    }
}