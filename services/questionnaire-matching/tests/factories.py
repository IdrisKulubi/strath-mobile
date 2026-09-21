def answer(index, *, own="yes", acceptable=None, weight=1, version=1):
    return {
        "questionVersionId": f"q{index}:{version}",
        "answerId": own,
        "acceptableAnswerIds": acceptable or ["yes"],
        "weight": weight,
    }


def person(identifier="viewer", count=10, weight=1):
    return {
        "id": identifier,
        "revision": 1,
        "answers": [answer(index, weight=weight) for index in range(count)],
    }


def request(candidates=None):
    return {
        "viewer": person(),
        "candidates": candidates if candidates is not None else [person("candidate")],
    }
