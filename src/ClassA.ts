import { ClassB } from "./ClassB";

export class ClassA {
    public getString(): string {
        return "Hello world" + ClassB.getStringSuffix();
    }

    public unusedMethod(): string {
        import("./chunk2/Class2D").then(({ Class2D }) => {
            Class2D.someMethod();
        });
        return "unusedMethod text";
    }
}