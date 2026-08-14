"""Qo'llab-quvvatlanadigan dasturlash tillari — YAGONA manba.

Ilgari til ro'yxati beshta joyda takrorlanardi (model choices, lokal runner,
tashqi xizmat id'lari, boshlang'ich kod ustunlari, frontend massivi) va yangi
til qo'shish uchun ularning hammasini qo'lda sinxronlash kerak edi. Endi
metama'lumot shu yerda: nomi, fayl kengaytmasi, muharrir tili va bo'sh
shablon. Kompilyatsiya/ishga tushirish buyruqlari esa runner konteynerida
(`infra/runner/executor.py`) — chunki ular aynan o'sha muhitga bog'liq.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class LanguageInfo:
    key: str
    label: str
    extension: str
    #: Monaco muharriridagi til identifikatori.
    monaco: str
    #: Masala ochilganda muharrirda turadigan bo'sh shablon.
    starter: str
    order: int


_PY_STARTER = """import sys


def main() -> None:
    data = sys.stdin.read().split()
    # Yechimingizni shu yerga yozing


main()
"""

_C_STARTER = """#include <stdio.h>

int main(void) {
    /* Yechimingizni shu yerga yozing */
    return 0;
}
"""

_CPP_STARTER = """#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // Yechimingizni shu yerga yozing
    return 0;
}
"""

_JS_STARTER = """const data = require("fs").readFileSync(0, "utf8").split(/\\s+/);

// Yechimingizni shu yerga yozing
"""

_TS_STARTER = """import { readFileSync } from "fs";

const data = readFileSync(0, "utf8").split(/\\s+/);

// Yechimingizni shu yerga yozing
"""

_JAVA_STARTER = """import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        // Yechimingizni shu yerga yozing
    }
}
"""

_GO_STARTER = """package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    writer := bufio.NewWriter(os.Stdout)
    defer writer.Flush()
    _ = reader
    _ = fmt.Sprint
    // Yechimingizni shu yerga yozing
}
"""

_RUST_STARTER = """use std::io::{self, Read, Write};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let stdout = io::stdout();
    let mut out = stdout.lock();
    let _ = &mut out;
    // Yechimingizni shu yerga yozing
}
"""

_CS_STARTER = """using System;

class Main_ {
    static void Main() {
        // Yechimingizni shu yerga yozing
    }
}
"""

_PHP_STARTER = """<?php
$data = trim(stream_get_contents(STDIN));

// Yechimingizni shu yerga yozing
"""

_RUBY_STARTER = """data = STDIN.read.split

# Yechimingizni shu yerga yozing
"""

_KT_STARTER = """fun main() {
    val data = generateSequence(::readLine).toList()
    // Yechimingizni shu yerga yozing
}
"""


LANGUAGES: tuple[LanguageInfo, ...] = (
    LanguageInfo("python", "Python 3", "py", "python", _PY_STARTER, 10),
    LanguageInfo("cpp", "C++ 17", "cpp", "cpp", _CPP_STARTER, 20),
    LanguageInfo("c", "C 17", "c", "c", _C_STARTER, 30),
    LanguageInfo("java", "Java 17", "java", "java", _JAVA_STARTER, 40),
    LanguageInfo("javascript", "JavaScript", "js", "javascript", _JS_STARTER, 50),
    LanguageInfo("typescript", "TypeScript", "ts", "typescript", _TS_STARTER, 60),
    LanguageInfo("go", "Go", "go", "go", _GO_STARTER, 70),
    LanguageInfo("rust", "Rust", "rs", "rust", _RUST_STARTER, 80),
    LanguageInfo("kotlin", "Kotlin", "kt", "kotlin", _KT_STARTER, 90),
    LanguageInfo("csharp", "C#", "cs", "csharp", _CS_STARTER, 100),
    LanguageInfo("php", "PHP", "php", "php", _PHP_STARTER, 110),
    LanguageInfo("ruby", "Ruby", "rb", "ruby", _RUBY_STARTER, 120),
)

BY_KEY: dict[str, LanguageInfo] = {item.key: item for item in LANGUAGES}

#: Django `TextChoices` uchun juftliklar.
CHOICES: list[tuple[str, str]] = [(item.key, item.label) for item in LANGUAGES]

#: Eskidan qolgan uchta til — `Problem.starter_code_*` ustunlari shular uchun.
LEGACY_KEYS = ("python", "javascript", "cpp")


def info(key: str) -> LanguageInfo | None:
    return BY_KEY.get(key)


def as_payload() -> list[dict]:
    """Frontendga beriladigan ro'yxat."""
    return [
        {
            "key": item.key,
            "label": item.label,
            "extension": item.extension,
            "monaco": item.monaco,
            "starter": item.starter,
        }
        for item in sorted(LANGUAGES, key=lambda row: row.order)
    ]
