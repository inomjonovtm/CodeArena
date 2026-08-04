"""Kurslarning tayyor kontenti.

Har bir modul bitta kursni tavsiflaydi. Yangi kurs qo'shish uchun shu
katalogda yangi fayl yarating va uni `COURSES` ro'yxatiga qo'shing —
`seed_courses` buyrug'iga tegish shart emas.
"""
from . import cpp_course, javascript_course, python_course

COURSES = [
    python_course.COURSE,
    javascript_course.COURSE,
    cpp_course.COURSE,
]

__all__ = ["COURSES"]
