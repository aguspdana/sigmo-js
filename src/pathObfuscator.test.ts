import { expect, test } from "vitest";
import { createPathObfuscator } from "./pathObfuscator";

test("createPathObfuscator", () => {
    const obfuscatePath = createPathObfuscator([
        "/dashboard/:project/*/",
        "/settings/*/:project/*",
        "/files/:project/:files",
        "/members//:member/*",
    ]);

    expect(obfuscatePath("/")).toBe("/");
    expect(obfuscatePath("/blog//how-react-works/")).toBe("/blog/how-react-works");
    expect(obfuscatePath("/dashboard/")).toBe("/dashboard");
    expect(obfuscatePath("/dashboard/abc")).toBe("/dashboard/:project");
    expect(obfuscatePath("/dashboard/abc/events")).toBe("/dashboard/:project/events");
    expect(obfuscatePath("/dashboard/abc/events/signup")).toBe("/dashboard/:project/events/signup");
    expect(obfuscatePath("/settings/events/abc/signup/props")).toBe("/settings/events/:project/signup/props");
    expect(obfuscatePath("/files/abc/note/2024-01-01")).toBe("/files/:project/:files");
    expect(obfuscatePath("/members/abc/settings")).toBe("/members/:member/settings");
});