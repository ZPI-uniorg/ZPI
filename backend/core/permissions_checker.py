from organizations.models import CombinedTag

def permission_to_access(user_permissions, required_permissions):
    basicTags = required_permissions.filter(combined=False)
    combinedTags = required_permissions.filter(combined=True)

    for tag in basicTags:
        if tag in user_permissions:
            return True

    for combinedTag in combinedTags:
        basic_tags = CombinedTag.objects.filter(combined_tag_id=combinedTag)
        has_all_basic_tags = all(basic_tag.basic_tag_id in user_permissions for basic_tag in basic_tags)
        if has_all_basic_tags:
            return True

    return False


def permission_to_add(user_permissions, required_permissions):
    basicTags = required_permissions.filter(combined=False)
    combinedTags = required_permissions.filter(combined=True)

    for tag in basicTags:
        if tag not in user_permissions:
            return False

    for combinedTag in combinedTags:
        basic_tags = CombinedTag.objects.filter(combined_tag_id=combinedTag)
        has_all_basic_tags = all(basic_tag.basic_tag_id in user_permissions for basic_tag in basic_tags)
        if not has_all_basic_tags:
            return False

    return True
