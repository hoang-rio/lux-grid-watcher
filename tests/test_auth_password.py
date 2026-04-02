import unittest
from unittest.mock import patch

from multi_tenant.auth import hash_password


def _build_password(length: int) -> str:
    if length < 3:
        raise ValueError("length must be >= 3 to include letter, number, and special char")

    base = ["A", "1", "!"]
    fill = "abC2$"

    idx = 0
    while len(base) < length:
        base.append(fill[idx % len(fill)])
        idx += 1

    # Keep deterministic output and exact target length.
    return "".join(base[:length])


class TestHashPassword(unittest.TestCase):
    def test_hash_password_from_length_3_to_50(self) -> None:
        def fake_hash(password: str) -> str:
            return f"hashed::{password[::-1]}"

        with patch("multi_tenant.auth._pwd_context.hash", side_effect=fake_hash) as mock_hash:
            for length in range(3, 51):
                password = _build_password(length)
                with self.subTest(length=length, password=password):
                    self.assertRegex(password, r"[A-Za-z]")
                    self.assertRegex(password, r"\d")
                    self.assertRegex(password, r"[^A-Za-z0-9]")

                    hashed = hash_password(password)

                    self.assertIsInstance(hashed, str)
                    self.assertTrue(hashed)
                    self.assertNotEqual(hashed, password)
                    self.assertTrue(hashed.startswith("hashed::"))

            self.assertEqual(mock_hash.call_count, 48)


if __name__ == "__main__":
    unittest.main()
